/* ==========================================================================
   TEAM IQ — GET /api/health
   --------------------------------------------------------------------------
   A one-line check that the Function layer is deployed and answering.

     curl -s https://systemhelp.pages.dev/api/health

   If this returns JSON, Pages is serving the site and running the Functions in
   functions/. If it returns the website's 404 page, the build output directory
   is wrong (it must be `site`, so that the bundled functions are published with
   the site). If it returns 522, there is no deployment at all.
   ========================================================================== */

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "team-iq",
      runtime: "pages",
      time: new Date().toISOString()
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}