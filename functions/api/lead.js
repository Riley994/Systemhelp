/* ==========================================================================
   TEAM IQ — Cloudflare Pages Function: POST /api/lead
   --------------------------------------------------------------------------
   This is the version that runs when the site is hosted on Cloudflare Pages.
   It behaves exactly like server/server.mjs so the website code is identical
   on both hosts.

   Set these in Cloudflare → Pages → your project → Settings → Environment
   variables (Production and Preview):
     CRM_WEBHOOK_URL     GoHighLevel inbound webhook (or any endpoint)
     RESEND_API_KEY      Resend API key for the owner notification email
     LEAD_NOTIFY_EMAIL   where leads are emailed (default: andrew@systemhelp.co.uk)
     LEAD_FROM_EMAIL     verified sender (default: website@systemhelp.co.uk)
   ========================================================================== */

const clean = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // bot traps
  if (clean(data.website)) return json({ ok: true, note: "ignored" });
  const submittedAt = Date.parse(data.submittedAt || "");
  if (Number.isFinite(submittedAt) && Date.now() - submittedAt < 2000) {
    return json({ ok: true, note: "ignored" });
  }

  const lead = {
    form: clean(data.form, 40) || "enquiry",
    name: clean(data.name, 120),
    email: clean(data.email, 180),
    company: clean(data.company, 160),
    role: clean(data.role, 120),
    teamSize: clean(data.team_size, 40),
    phone: clean(data.phone, 40),
    interest: clean(data.interest, 120),
    message: clean(data.message, 4000),
    score: clean(data.score, 10),
    weakestPillar: clean(data.weakest_pillar, 40),
    pillarScores: clean(data.pillar_scores, 400),
    page: clean(data.page, 200),
    receivedAt: new Date().toISOString(),
    userAgent: clean(request.headers.get("user-agent"), 200)
  };

  const problems = [];
  if (!lead.name) problems.push("name");
  if (!isEmail(lead.email)) problems.push("email");
  if (problems.length) return json({ ok: false, error: "invalid_fields", fields: problems }, 400);

  const results = { crm: "skipped", email: "skipped" };

  if (env.CRM_WEBHOOK_URL) {
    try {
      const r = await fetch(env.CRM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "systemhelp.co.uk", ...lead })
      });
      results.crm = r.ok ? "sent" : "failed_" + r.status;
    } catch { results.crm = "error"; }
  }

  if (env.RESEND_API_KEY) {
    const to = env.LEAD_NOTIFY_EMAIL || "andrew@systemhelp.co.uk";
    const from = env.LEAD_FROM_EMAIL || "website@systemhelp.co.uk";
    const lines = Object.entries(lead)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `TEAM IQ website <${from}>`,
          to: [to],
          reply_to: lead.email,
          subject: `New ${lead.form} lead: ${lead.name}${lead.company ? " — " + lead.company : ""}`,
          text: lines
        })
      });
      results.email = r.ok ? "sent" : "failed_" + r.status;
    } catch { results.email = "error"; }
  }

  if (results.crm !== "sent" && results.email !== "sent") {
    console.log("[lead] not delivered downstream", JSON.stringify({ results, lead }));
  }

  return json({ ok: true, delivered: results });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}