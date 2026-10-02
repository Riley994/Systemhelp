/* ==========================================================================
   TEAM IQ — POST /api/lead
   --------------------------------------------------------------------------
   This single handler serves both Cloudflare hosts, so there is only ever one
   copy of the lead logic in the repository:

     Cloudflare Pages     this file is a Pages Function
     Cloudflare Workers   worker/index.js imports it (that is how this site is
                          deployed) and routes /api/* to it

   It validates the submission and hands delivery to shared/lead-delivery.js,
   which the local Node server uses as well. Delivery destinations:

     1. GoHighLevel, direct API     GHL_TOKEN + GHL_LOCATION_ID
     2. Generic webhook             CRM_WEBHOOK_URL
     3. Owner notification email    RESEND_API_KEY

   Where to set them on Cloudflare:
     Workers & Pages → systemhelp → Settings → Variables and Secrets

   Full setup instructions, including how to create the GoHighLevel token:
     docs/gohighlevel-integration.md
   ========================================================================== */

import { deliverLead } from "../../shared/lead-delivery.js";

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

  // bot traps: a filled honeypot, or a form completed impossibly fast
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

  const delivered = await deliverLead(lead, env || {});
  return json({ ok: true, delivered });
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