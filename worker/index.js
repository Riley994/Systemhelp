/* ==========================================================================
   TEAM IQ — Cloudflare Worker entry point
   --------------------------------------------------------------------------
   This file exists only because Cloudflare's Git integration deploys a
   Worker, not a Pages project. It contains no new logic: it imports the same
   handler the Pages version uses, so there is still exactly one copy of the
   lead-capture code in the repository.

     functions/api/lead.js   the shared handler (used by Pages and by this)
     worker/index.js         this file — routing only
     server/server.mjs       the Node equivalent, for local development

   Routes:
     GET  /api/health   is the Worker running at all
     POST /api/lead     capture a form submission
     OPTIONS /api/lead  CORS pre-flight
     anything else      served from ./site, with site/404.html for misses
   ========================================================================== */

import { onRequestPost, onRequestOptions } from "../functions/api/lead.js";

// Only the pathname of an assets-binding request is used to match a file — the
// hostname is not meaningful. Subrequests are therefore sent to a neutral
// origin rather than to the incoming URL. Forwarding the original URL means
// asking the Worker to fetch a URL that this same Worker answers for, which
// Cloudflare blocks as a same-zone Worker-to-Worker request and reports as
// "error code: 1042".
const ASSET_ORIGIN = "https://assets.internal";

const assetRequest = (url, request) =>
  new Request(new URL(url.pathname + url.search, ASSET_ORIGIN), request);

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // A probe that never touches the assets binding, so the Worker can be
    // checked on its own. If this answers with JSON, the script is running. If
    // the whole hostname answers "error code: 1042", no code ran at all and the
    // fault is in the deployment, the hostname or the route configuration.
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "team-iq",
        runtime: "worker",
        assets: Boolean(env && env.ASSETS),
        time: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/lead") {
      if (request.method === "OPTIONS") return onRequestOptions();
      if (request.method !== "POST") {
        return json({ ok: false, error: "method_not_allowed" }, 405, { Allow: "POST, OPTIONS" });
      }
      return onRequestPost({ request, env });
    }

    // Static files. This branch runs only when Cloudflare forwards a request to
    // the Worker, which happens for /api/* and — if run_worker_first is ever
    // changed — for everything else as well.
    const response = await env.ASSETS.fetch(assetRequest(url, request));

    // A missing page should show the branded 404, not Cloudflare's default.
    if (response.status === 404) {
      const fallback = await env.ASSETS.fetch(
        assetRequest(new URL("/404.html", url), request)
      );
      if (fallback.ok) {
        return new Response(fallback.body, { status: 404, headers: fallback.headers });
      }
    }

    return response;
  }
};