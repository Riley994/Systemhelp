/* ==========================================================================
   TEAM IQ — Node server
   --------------------------------------------------------------------------
   Two jobs, no dependencies:
     1. Serve the static website from /site
     2. Handle POST /api/lead

   Lead delivery lives in shared/lead-delivery.js so that local development
   behaves exactly like production. Read that file for the full variable list.

   Environment variables (all optional — the server runs fine without them, it
   simply has nowhere to send leads):
     GHL_TOKEN           GoHighLevel Private Integration token
     GHL_LOCATION_ID     GoHighLevel sub-account (location) id
     CRM_WEBHOOK_URL     any webhook, including a GoHighLevel inbound webhook
     RESEND_API_KEY      Resend API key for the owner notification email
     LEAD_NOTIFY_EMAIL   where leads are emailed (default: andrew@systemhelp.co.uk)
     LEAD_FROM_EMAIL     verified sender (default: website@systemhelp.co.uk)
   ========================================================================== */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { onRequestPost } from "../functions/api/lead.js";

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
/* ------------------------------------------------------------------- lead */
// Validation, the bot traps and delivery live in exactly one place: the Pages
// Function in functions/api/lead.js, which shared/lead-delivery.js then sends
// onward. It is handed a standard Request and env object here — precisely what
// Cloudflare hands it — so local behaviour cannot drift from production. Before
// this, the two copies had already diverged over the bot trap.
async function handleLead(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(res, 413, { ok: false, error: "payload_too_large" });
  }

  const request = new Request("http://localhost/api/lead", {
    method: "POST",
    headers: {
      "Content-Type": req.headers["content-type"] || "application/json",
      "User-Agent": req.headers["user-agent"] || ""
    },
    body
  });

  const response = await onRequestPost({ request, env: process.env });
  const payload = await response.text();
  res.writeHead(response.status, {
    "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store"
  });
  res.end(payload);
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
