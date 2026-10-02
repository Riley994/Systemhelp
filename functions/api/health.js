/* ==========================================================================
   TEAM IQ — GET /api/health
   --------------------------------------------------------------------------
   A one-line check that the Function layer is deployed, answering, and able to
   see the lead configuration.

     curl -s https://systemhelp.pages.dev/api/health

   How to read it:

     no response / 522        no successful deployment is serving the project
     the website's 404 page   the build output directory is wrong (must be `site`)
     JSON with config: {...}  the Function is live; the booleans below say which
                              destinations this deployment can reach

   The config block reports presence only — never a value — so it is safe to
   share, and it tells "the variable is missing" apart from "the token was
   rejected" without opening the dashboard. If GHL_TOKEN is true but submissions
   still report failed_401, the token itself or its scope is the problem.
   ========================================================================== */

export async function onRequestGet({ env = {} } = {}) {
  const present = (value) => typeof value === "string" && value.trim().length > 0;

  return new Response(
    JSON.stringify({
      ok: true,
      service: "team-iq",
      runtime: "pages",
      time: new Date().toISOString(),
      config: {
        ghlToken: present(env.GHL_TOKEN),
        ghlLocationId: present(env.GHL_LOCATION_ID),
        webhook: present(env.CRM_WEBHOOK_URL),
        email: present(env.RESEND_API_KEY)
      }
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}