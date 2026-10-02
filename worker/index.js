/* ==========================================================================
   TEAM IQ — Cloudflare Worker entry point
   --------------------------------------------------------------------------
   This file exists only because Cloudflare's Git integration deploys a
   Worker, not a Pages project. It does not contain any new logic: it imports
   the same handler that the Pages version uses, so there is still exactly one
   copy of the lead-capture code in the repository.

     functions/api/lead.js   the shared handler (used by Pages and by this)
     worker/index.js         this file — routing only
     server/server.mjs       the Node equivalent, for local development

   Routes:
     POST /api/lead   capture a form submission
     OPTIONS /api/lead  CORS pre-flight
     anything else    served from ./site, with site/404.html for misses
   ========================================================================== */

import { onRequestPost, onRequestOptions } from "../functions/api/lead.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // A probe that never touches the assets binding, so the Worker can be
    // checked on its own. If this answers with JSON, the script is running. If
    // the whole hostname answers "error code: 1042", the code never ran and the
    // fault is in the hostname or route configuration, not in this file.
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({ ok: true, service: "team-iq", runtime: "worker", time: new Date().toISOString() }),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    if (url.pathname === "/api/lead") {
      if (request.method === "OPTIONS") return onRequestOptions();
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json; charset=utf-8", Allow: "POST, OPTIONS" }
        });
      }
      return onRequestPost({ request, env });
    }

    // Static files. This branch runs only when Cloudflare forwards a request
    // to the Worker, which happens for /api/* and — if the run_worker_first
    // setting is ever switched to `true` — for everything else as well.
    const response = await env.ASSETS.fetch(request);

    // A missing page should show the branded 404, not Cloudflare's default.
    if (response.status === 404) {
      const fallback = await env.ASSETS.fetch(new URL("/404.html", url.origin));
      if (fallback.ok) {
        return new Response(fallback.body, {
          status: 404,
          headers: fallback.headers
        });
      }
    }

    return response;
  }
};
