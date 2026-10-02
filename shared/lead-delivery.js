/* ==========================================================================
   TEAM IQ — lead delivery
   --------------------------------------------------------------------------
   One place that decides where a submitted lead goes. Used by every host, so
   the behaviour is identical in production and in local development:

     functions/api/lead.js   Cloudflare — the Pages Function, which the Worker
                             also calls (see worker/index.js)
     server/server.mjs       the dependency-free Node server

   Destinations, each independent and each optional. The visitor's submission
   is never failed because a downstream service is down; the outcome is
   reported back in the response and logged when nothing got through.

     1. GoHighLevel, direct API     GHL_TOKEN + GHL_LOCATION_ID
     2. Generic webhook             CRM_WEBHOOK_URL   (any CRM, including a
                                    GoHighLevel inbound webhook)
     3. Owner notification email    RESEND_API_KEY

   GoHighLevel environment variables
     GHL_TOKEN           Private Integration token, from the sub-account
     GHL_LOCATION_ID     the sub-account (location) id
     GHL_API_BASE        optional — defaults to https://services.leadconnectorhq.com
     GHL_API_VERSION     optional — defaults to 2021-07-28
     GHL_CUSTOM_FIELDS   optional JSON mapping a lead field to a GoHighLevel
                         custom field id, e.g. {"score":"aBc123","weakestPillar":"dEf456"}
     GHL_NOTES           optional — set to "off" to stop writing the enquiry note

   Why the tags are added in a second call rather than sent with the contact:
   the upsert endpoint's `tags` field OVERWRITES every tag already on the
   contact. Sending them there would wipe tags your workflows depend on. The
   Add Tag endpoint is additive, so a returning visitor keeps their history.
   ========================================================================== */

const TIMEOUT_MS = 8000;

const slug = (value, max = 40) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);

function fetchWithTimeout(url, init) {
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(TIMEOUT_MS)
      : undefined;
  return fetch(url, signal ? { ...init, signal } : init);
}

export function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/* GoHighLevel stores phone numbers in E.164. A UK number typed the national way —
   "07388 878732" — was read as a US number and saved as "+107388878732", which
   breaks click-to-call and SMS from the contact record. Normalise before sending. */
export function phoneForGhl(raw) {
  const digits = String(raw || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;                       // already international
  if (/^0\d{9,10}$/.test(digits)) return "+44" + digits.slice(1);  // UK national format
  return digits;
}

/* Mirrors the bands in site/assets/js/scorecard.js. Keep the two in step:
   0-39 Reactive, 40-59 Emerging, 60-74 Developing, 75-89 Strong, 90-100 Exemplary. */
export function bandFor(score) {
  const n = Number(score);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n <= 39) return "reactive";
  if (n <= 59) return "emerging";
  if (n <= 74) return "developing";
  if (n <= 89) return "strong";
  return "exemplary";
}

export function tagsForLead(lead) {
  const tags = ["website-lead"];
  tags.push("form-" + (slug(lead.form) || "enquiry"));
  const band = bandFor(lead.score);
  if (band) {
    tags.push("iq-band-" + band);
    tags.push("iq-score-" + Number(lead.score));
  }
  if (lead.weakestPillar) tags.push("weakest-" + slug(lead.weakestPillar));
  if (lead.teamSize) tags.push("team-" + slug(lead.teamSize));
  return tags;
}

export function noteForLead(lead) {
  const rows = [
    ["Form", lead.form],
    ["Page", lead.page],
    ["Company", lead.company],
    ["Role", lead.role],
    ["Team size", lead.teamSize],
    ["Phone", lead.phone],
    ["Interest", lead.interest],
    ["Area of concern", lead.message],
    ["Score", lead.score ? `${lead.score}/100` : ""],
    ["Band", bandFor(lead.score)],
    ["Weakest pillar", lead.weakestPillar],
    ["Pillar scores", lead.pillarScores],
    ["Received", lead.receivedAt]
  ];
  const body = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `Website enquiry — ${lead.form || "enquiry"}\n\n${body}`;
}

async function ghlFetch(env, path, payload) {
  const base = (env.GHL_API_BASE || "https://services.leadconnectorhq.com").replace(/\/+$/, "");
  const res = await fetchWithTimeout(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GHL_TOKEN}`,
      Version: env.GHL_API_VERSION || "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* a body is not guaranteed; the status is what matters */
  }
  return { ok: res.ok, status: res.status, data };
}

function customFieldsFor(lead, env) {
  if (!env.GHL_CUSTOM_FIELDS) return [];
  let map;
  try {
    map = JSON.parse(env.GHL_CUSTOM_FIELDS);
  } catch {
    console.warn("[lead] GHL_CUSTOM_FIELDS is not valid JSON — ignoring it");
    return [];
  }
  return Object.entries(map)
    .map(([field, id]) => ({ id, value: lead[field] }))
    .filter((entry) => entry.id && entry.value);
}

/**
 * Create or update the contact in a GoHighLevel sub-account.
 * Returns { status, contactId } — status is "created", "updated", "failed_<code>",
 * "error" or "config_incomplete".
 */
export async function deliverToGoHighLevel(lead, env = {}) {
  if (!env.GHL_TOKEN) return { status: "skipped" };
  if (!env.GHL_LOCATION_ID) {
    console.warn("[lead] GHL_TOKEN is set but GHL_LOCATION_ID is missing — nothing sent");
    return { status: "config_incomplete" };
  }

  const { firstName, lastName } = splitName(lead.name);
  let result;
  try {
    result = await ghlFetch(env, "/contacts/upsert", {
      locationId: env.GHL_LOCATION_ID,
      firstName,
      lastName,
      name: lead.name,
      email: lead.email,
      source: `systemhelp.co.uk — ${lead.form || "enquiry"}`,
      ...(lead.phone ? { phone: phoneForGhl(lead.phone) } : {}),
      ...(lead.company ? { companyName: lead.company } : {}),
      ...(customFieldsFor(lead, env).length ? { customFields: customFieldsFor(lead, env) } : {})
    });
  } catch (err) {
    console.warn("[lead] GoHighLevel request failed:", err && err.message);
    return { status: "error" };
  }

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      console.warn("[lead] GoHighLevel rejected the token — check GHL_TOKEN and its scopes");
    }
    return { status: "failed_" + result.status, detail: result.data };
  }

  const contact = (result.data && result.data.contact) || {};
  const contactId = contact.id;
  const status = result.data && result.data.new ? "created" : "updated";
  const extra = { tags: "skipped", note: "skipped" };

  if (!contactId) return { status, contactId: undefined, ...extra };

  // Tags are additive: POST /contacts/:id/tags adds to whatever is already there.
  try {
    const tagged = await ghlFetch(env, `/contacts/${contactId}/tags`, { tags: tagsForLead(lead) });
    extra.tags = tagged.ok ? "added" : "failed_" + tagged.status;
  } catch {
    extra.tags = "error";
  }

  // The note keeps the free-text detail on the contact record, where the person
  // picking the lead up will actually look for it.
  if (String(env.GHL_NOTES || "").toLowerCase() !== "off") {
    try {
      const noted = await ghlFetch(env, `/contacts/${contactId}/notes`, {
        title: `Website enquiry — ${lead.form || "enquiry"}`,
        body: noteForLead(lead)
      });
      extra.note = noted.ok ? "added" : "failed_" + noted.status;
    } catch {
      extra.note = "error";
    }
  }

  return { status, contactId, ...extra };
}

async function deliverToWebhook(lead, env) {
  if (!env.CRM_WEBHOOK_URL) return "skipped";
  try {
    const res = await fetchWithTimeout(env.CRM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "systemhelp.co.uk", ...lead })
    });
    return res.ok ? "sent" : "failed_" + res.status;
  } catch {
    return "error";
  }
}

async function deliverEmail(lead, env) {
  if (!env.RESEND_API_KEY) return "skipped";
  // comma-separated, so one lead can reach several inboxes
  const to = (env.LEAD_NOTIFY_EMAIL || "andrew@systemhelp.co.uk")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const from = env.LEAD_FROM_EMAIL || "website@systemhelp.co.uk";
  const lines = Object.entries(lead)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  try {
    const res = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `TEAM IQ website <${from}>`,
        to: to,
        reply_to: lead.email,
        subject: `New ${lead.form} lead: ${lead.name}${lead.company ? " — " + lead.company : ""}`,
        text: lines
      })
    });
    if (res.ok) return "sent";
    // A bare status code ("failed_403") sends you hunting. Resend explains
    // itself in the body — usually that the sending domain is not verified —
    // so keep a short version of it alongside the code.
    let reason = "";
    try {
      const body = await res.json();
      reason = body?.message || body?.error?.message || body?.error || "";
    } catch {
      /* a body that will not parse is not worth failing over */
    }
    return "failed_" + res.status + (reason ? ": " + String(reason).slice(0, 140) : "");
  } catch {
    return "error";
  }
}

/**
 * Send a lead everywhere it is configured to go.
 * Returns the per-destination outcome, which the API echoes back to the browser.
 */
export async function deliverLead(lead, env = {}) {
  const ghl = await deliverToGoHighLevel(lead, env);
  const results = {
    ghl: ghl.status,
    ghlTags: ghl.tags || "skipped",
    ghlNote: ghl.note || "skipped",
    crm: await deliverToWebhook(lead, env),
    email: await deliverEmail(lead, env)
  };

  // Nothing got through: keep the lead in the log so it can be recovered.
  const delivered =
    results.ghl === "created" ||
    results.ghl === "updated" ||
    results.crm === "sent" ||
    results.email === "sent";
  if (!delivered) {
    console.log("[lead] not delivered downstream", JSON.stringify({ results, lead }));
  }

  return results;
}
