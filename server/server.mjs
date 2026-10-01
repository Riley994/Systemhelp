/* ==========================================================================
   TEAM IQ — Node server
   --------------------------------------------------------------------------
   Two jobs, no dependencies:
     1. Serve the static website from /site
     2. Handle POST /api/lead  (validate, forward to the CRM, email the owner)

   Environment variables (all optional — the server runs fine without them,
   it simply has nowhere to forward leads to):
     CRM_WEBHOOK_URL     GoHighLevel inbound webhook (or any endpoint)
     RESEND_API_KEY      Resend API key for the owner notification email
     LEAD_NOTIFY_EMAIL   where leads are emailed (default: andrew@systemhelp.co.uk)
     LEAD_FROM_EMAIL     verified sender (default: website@systemhelp.co.uk)
   ========================================================================== */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "site");
const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".ics": "text/calendar; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

/* ---------------------------------------------------------------- helpers */
function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

async function readBody(req, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("payload_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const clean = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/* ------------------------------------------------------------------- lead */
async function handleLead(req, res) {
  let data;
  try {
    const raw = await readBody(req);
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return json(res, 400, { ok: false, error: "bad_request" });
  }

  // bot traps: honeypot field, or a form completed impossibly fast
  if (clean(data.website)) return json(res, 200, { ok: true, note: "ignored" });
  const submittedAt = Date.parse(data.submittedAt || "");
  if (Number.isFinite(submittedAt) && Date.now() - submittedAt < 2000) {
    return json(res, 200, { ok: true, note: "ignored" });
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
    userAgent: clean(req.headers["user-agent"], 200)
  };

  const problems = [];
  if (!lead.name) problems.push("name");
  if (!isEmail(lead.email)) problems.push("email");
  if (problems.length) return json(res, 400, { ok: false, error: "invalid_fields", fields: problems });

  const results = { crm: "skipped", email: "skipped" };

  // 1. CRM webhook — the original record
  if (process.env.CRM_WEBHOOK_URL) {
    try {
      const r = await fetch(process.env.CRM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "systemhelp.co.uk", ...lead }),
        signal: AbortSignal.timeout(8000)
      });
      results.crm = r.ok ? "sent" : "failed_" + r.status;
    } catch { results.crm = "error"; }
  }

  // 2. Owner notification — the safety net so a lead is never lost
  if (process.env.RESEND_API_KEY) {
    const to = process.env.LEAD_NOTIFY_EMAIL || "andrew@systemhelp.co.uk";
    const from = process.env.LEAD_FROM_EMAIL || "website@systemhelp.co.uk";
    const lines = Object.entries(lead)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `TEAM IQ website <${from}>`,
          to: [to],
          reply_to: lead.email,
          subject: `New ${lead.form} lead: ${lead.name}${lead.company ? " — " + lead.company : ""}`,
          text: lines
        }),
        signal: AbortSignal.timeout(8000)
      });
      results.email = r.ok ? "sent" : "failed_" + r.status;
    } catch { results.email = "error"; }
  }

  // Never fail the visitor's submission because a downstream service is down:
  // log it so it can be recovered from the server log.
  if (results.crm !== "sent" && results.email !== "sent") {
    console.log("[lead] not delivered downstream", JSON.stringify({ results, lead }));
  }

  return json(res, 200, { ok: true, delivered: results });
}

/* ----------------------------------------------------------------- static */
async function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return json(res, 400, { ok: false, error: "bad_path" });
  }
  if (pathname.endsWith("/")) pathname += "index.html";

  const relative = normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  let filePath = join(ROOT, relative);
  if (!filePath.startsWith(ROOT)) return json(res, 403, { ok: false, error: "forbidden" });

  let info = await stat(filePath).catch(() => null);
  if (info && info.isDirectory()) {
    filePath = join(filePath, "index.html");
    info = await stat(filePath).catch(() => null);
  }
  if (!info) {
    const notFound = join(ROOT, "404.html");
    const html = await readFile(notFound).catch(() => null);
    if (html) {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      return res.end(html);
    }
    return json(res, 404, { ok: false, error: "not_found" });
  }

  const body = await readFile(filePath);
  const ext = extname(filePath).toLowerCase();
  // Nothing here is fingerprinted, because there is no build step. Only the
  // fonts can be cached long-term; code, pages and documents must be able to
  // change the moment a file is edited, so they revalidate on every request.
  // Images get an hour, which a hard refresh clears.
  const revalidate = [".html", ".json", ".css", ".js", ".mjs", ".pdf", ".xml", ".txt"].includes(ext);
  const cacheControl = revalidate
    ? "no-cache"
    : ext === ".woff2"
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600";
  res.writeHead(200, {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  });
  res.end(body);
}

/* ----------------------------------------------------------------- server */
const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname === "/api/health") return json(res, 200, { ok: true, service: "team-iq", time: new Date().toISOString() });
  if (pathname === "/api/lead") {
    if (req.method === "OPTIONS") {
      res.writeHead(204, { Allow: "POST, OPTIONS", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" });
      return res.end();
    }
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "method_not_allowed" });
    return handleLead(req, res);
  }
  if (pathname.startsWith("/api/")) return json(res, 404, { ok: false, error: "unknown_endpoint" });
  if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { ok: false, error: "method_not_allowed" });

  try {
    await serveStatic(req, res);
  } catch (err) {
    console.error("[static]", err);
    json(res, 500, { ok: false, error: "server_error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TEAM IQ site serving ${ROOT} on http://${HOST}:${PORT}`);
});
