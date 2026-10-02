/* ==========================================================================
   TEAM IQ — SITE SETTINGS
   --------------------------------------------------------------------------
   This is the one file to edit when a link, a date, a phone number or a
   payment link changes. Nothing here needs a developer.

   HOW TO EDIT
   1. Change the value between the quote marks.
   2. Save the file and commit it to GitHub. The site updates automatically.

   Leave a value as "" (empty quotes) and the page will fall back gracefully
   instead of showing a broken button or an empty frame.

   NOTE ON PRICES: prices live in the HTML of each page (so they are readable
   by search engines and work without JavaScript). See README.md for the list
   of files that contain each price.
   ========================================================================== */

window.TEAMIQ = {

  /* ---------------------------------------------------------------------
     1. CONTACT DETAILS
     --------------------------------------------------------------------- */
  contact: {
    email: "andrew@systemhelp.co.uk",          // where enquiries are sent
    phone: "07388 878732",
    phoneIntl: "+447388878732",               // used for the tel: link, so it works from abroad
    company: "Network Advansys Limited",       // the legal entity
    tradingAs: "Systemhelp",                   // the trading name customers know
    companyNumber: "3503850",
    registeredOffice: "49 Station Road, Polegate, East Sussex, England, BN26 6EA",
    address: "49 Station Road, Polegate, East Sussex, England, BN26 6EA",
    linkedin: ""                               // your LinkedIn profile URL
  },

  /* ---------------------------------------------------------------------
     2. BOOKING CALENDAR
     Paste your GoHighLevel calendar embed URL (or Cal.com / Calendly).
     If both are blank, the site shows "email us to arrange a time" instead
     of an empty box — so it never looks broken.
     --------------------------------------------------------------------- */
  booking: {
    /* Paste the URL from GoHighLevel → Calendars → your calendar → Share →
       "Embed code". It looks like
         https://api.leadconnectorhq.com/widget/booking/XXXXXXXX
       Open that URL in a browser before pasting it here: a working one shows
       the calendar, a wrong one shows "404 Page Not Found" and would put a
       broken box on the page. While this is blank, the booking section shows
       the email route instead. */
    embedUrl: "https://api.leadconnectorhq.com/widget/booking/bnoL5X9wCAEEUo3UruPt",
    linkUrl: "https://api.leadconnectorhq.com/widget/booking/bnoL5X9wCAEEUo3UruPt"
  },

  /* ---------------------------------------------------------------------
     3. STRIPE PAYMENT LINKS (GBP)
     Create these in Stripe → Payment Links, then paste the URLs here.
     While blank, the buttons send people to the enquiry form instead.
     --------------------------------------------------------------------- */
  payments: {
    diagnosticSession: "",     // £1,200 + VAT
    pillarSprint: "",          // £6,500 + VAT
    corporateDiagnostic: "",   // from £18,000 + VAT  (usually invoiced)
    programme: ""              // from £45,000 + VAT  (usually invoiced)
  },

  /* ---------------------------------------------------------------------
     4. WORKSHOP
     Update nextDate each month. Format: YYYY-MM-DD
     --------------------------------------------------------------------- */
  workshop: {
    cadence: "First Tuesday of every month",
    time: "12:00 – 13:00 UK time",
    nextDate: "2026-11-03",
    icsUrl: "/assets/downloads/team-iq-workshop.ics"
  },

  /* ---------------------------------------------------------------------
     5. BOARD CASE — cost-of-inaction model
     These are only DEFAULTS. Every one of them is editable by the visitor
     on the page, which is what makes the number credible.
     --------------------------------------------------------------------- */
  boardCase: {
    defaults: {
      teams: 10,                 // number of delivery teams
      costPerTeam: 420000,       // fully-loaded annual cost of one team (£)
      reworkPct: 15,             // % of effort lost to rework
      decisionLatencyDays: 7,    // days to reach a decision that should take hours
      delayIntensity: 50,        // % of team capacity affected while a decision is pending
      stalledInitiatives: 1,     // failed or stalled initiatives in the last 3 years
      stalledCost: 250000        // average cost of one stalled initiative (£)
    },
    workingDaysPerYear: 220,
    programmePrice: 45000,       // used to calculate payback
    businessCasePdf: "/assets/downloads/team-iq-business-case.pdf",
    benchmarkPdf: "/assets/downloads/team-iq-benchmark-report.pdf",
    sampleDiagnosticPdf: "/assets/downloads/team-iq-sample-diagnostic.pdf"
  },

  /* ---------------------------------------------------------------------
     6. ANALYTICS (optional)
     Cloudflare Web Analytics token — cookieless, so no cookie banner needed.
     --------------------------------------------------------------------- */
  analytics: {
    cloudflareToken: ""
  }
};
