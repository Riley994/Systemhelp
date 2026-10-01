# Funnel and technology options

Answers to the open questions about lead capture, booking, currency, workshop logistics and automation — with the pros and cons of each route and a recommendation.

Nothing here changes the website. The site works today with no third-party services attached; this document is about what to connect and when.

---

## 1. Where the leads go

Every form on the site posts JSON to **`/api/lead`**. That endpoint is already written twice — once as a Cloudflare Pages Function (`functions/api/lead.js`) and once for the Node/Manus server (`server/server.mjs`) — and it behaves identically. It validates, blocks bots, then does two things:

1. forwards the lead to a CRM webhook (if `CRM_WEBHOOK_URL` is set), and
2. emails you a copy (if `RESEND_API_KEY` is set).

If neither is set, the lead is written to the server log and the visitor still sees the thank-you page. Nothing is lost and nothing breaks.

### Option A — Cloudflare Function → webhook + email *(recommended)*

**What it is:** the setup already built into this site. One Cloudflare Pages Function, one webhook URL, one email key.

| | |
|---|---|
| **Cost** | Cloudflare Pages free tier: 100,000 function invocations a day. Resend: free up to 3,000 emails a month, then $20/month for 50,000. GoHighLevel inbound webhook: included in your sub-account. |
| **Pros** | No new platform. Leads arrive in your CRM and in your inbox simultaneously, so a CRM outage cannot lose a lead. Fully version-controlled — the logic lives in your GitHub repo with the rest of the site. No per-contact fee. You can add fields without a visual form builder. |
| **Cons** | You maintain the field mapping yourself. Nothing here will send a nurture sequence for you — that is the CRM's job, and it does it well once the contact exists. |
| **Effort to set up** | About 20 minutes: create the inbound webhook in GoHighLevel, paste two environment variables into Cloudflare. |

### Option B — Systeme.io as the form handler

**What it is:** embed Systeme.io forms (or post to Systeme's API) instead of using your own endpoint.

| | |
|---|---|
| **Cost** | Free plan exists but is limited (no automation on the free tier). Paid plans from around $27/month. |
| **Pros** | Built-in funnels, email sequences and course hosting in one place. Non-technical editing of forms and sequences. |
| **Cons** | You have said you have nothing built in Systeme, so this means starting from zero. Embedded forms rarely match a custom design exactly. It puts a third-party script on every page, which costs you the performance advantage of a static site. Two sources of truth for contacts. |
| **Verdict** | Only worth it if you also want Systeme for course delivery or email marketing. For lead capture alone it is more moving parts than a webhook. |

### Option C — GoHighLevel (your existing sub-account) *(recommended, in combination)*

**What it is:** keep this site's own endpoint, and point `CRM_WEBHOOK_URL` at an inbound webhook inside your existing sub-account.

| | |
|---|---|
| **Cost** | Already paid for. Inbound webhooks are included. |
| **Pros** | You already have the account. Contacts, pipelines, calendars, SMS and follow-up all exist there. Inbound webhooks need no API key on the website, so there is no credential to leak. You can build the whole nurture sequence — workshop reminders, scorecard follow-up, diagnostic no-shows — in the tool you already pay for. |
| **Cons** | GoHighLevel is a big product; someone has to own the pipeline and the automations, or leads land in a list nobody reads. |
| **Effort** | One webhook, one field map, one workflow. An afternoon's work for the first version. |

### Recommendation

**Option A + C together.** The Cloudflare Function is the pipe; GoHighLevel is the destination. Keep the email copy as a safety net so a CRM problem never costs you a lead. Leave Systeme out unless you decide to use it for course delivery.

### Field mapping for the GoHighLevel webhook

| Site field | Typical CRM field |
| --- | --- |
| `name` | Contact first/last name |
| `email` | Email |
| `company` | Company name |
| `role` | Job title |
| `teamSize` | Custom field — "Delivery teams" |
| `interest` | Custom field — "Interest" (drives the pipeline stage) |
| `score` / `weakestPillar` | Custom fields — "Team IQ Score" / "Weakest pillar" |
| `message` | Note |
| `form` | Custom field — "Source form" (`scorecard`, `workshop`, `board-case`, `book`, `diagnostic-enquiry`, `enquiry`) |

The `form` field is the most valuable one: it tells you which rung of the ladder produced the lead, so you can measure the funnel rather than guess at it.

---

## 2. Booking a diagnostic session

The page is already built to accept any of these — the switch is `booking.provider` and `booking.<provider>Url` in `site/assets/js/config.js`. Until it is set, the page shows an email fallback, so it never looks broken.

| Option | Cost | Pros | Cons |
| --- | --- | --- | --- |
| **Cal.com** (self-hosted) | Free, open source | No per-seat fee, full control, brandable, works with Google/Outlook calendars | You host it — unless you use their cloud |
| **Cal.com cloud** | Free tier, ~$12/user/month for teams | Simplest good-looking option, free tier is genuinely usable | Free tier limits some features |
| **Calendly** | Free tier, ~$10–16/user/month | Zero setup, extremely familiar to UK buyers, PA-friendly | Free tier is single event type; branding is limited |
| **GoHighLevel calendar** | Included in your sub-account | Bookings land straight in the CRM with the contact attached; reminders and SMS included | The public booking page is the weakest part of the product visually |
| **Stripe payment link + manual scheduling** | 1.5% + 20p per transaction | Money first, no calendar account at all | You are back to emailing times |

**Recommendation:** start with **Cal.com cloud on the free tier**. It is the fastest to set up, it looks credible, and it will be brandable later. If you find you are chasing no-shows, move booking into **GoHighLevel** so the calendar and the reminders live where the contact already is.

For payment, keep it out of the calendar at first: invoice after the session. When you want card payment up front, add a **Stripe payment link** and set `stripe.links.diagnosticSession` in `config.js` — the diagnostic page already has the button wired to that setting.

---

## 3. Currency: pounds sterling

The site is priced in pounds only, with VAT stated separately on every price. That is deliberate:

- Your buyers are UK businesses that reclaim VAT. A price that hides VAT is harder to approve internally, not easier.
- A currency switcher would create a maintenance problem — three sets of prices to keep aligned — for a benefit almost nobody in your target market needs.
- For the rare overseas enquiry, a GBP invoice is normal and your bank or Stripe does the conversion.

**If you do want multi-currency later:** the cheapest correct route is **Stripe**, which handles the presentment currency and the card conversion. Do not add a manual switcher to a static site; you would be maintaining prices that drift.

**VAT note:** once you are selling repeatedly to businesses, look at **Stripe Tax** (about 0.5% per transaction) for automatic UK VAT calculation and line-item reporting. It is not needed for the diagnostic session, but it saves real time once programme invoices are regular.

---

## 4. Workshop logistics

The site currently assumes: **monthly, first Tuesday, 12:00–13:00 UK time**, free, replay for 14 days, printable attendee notes. That is a deliberate starting point, not a fixed decision.

| Question | Suggested answer |
| --- | --- |
| How often? | Monthly. Weekly is a content treadmill you do not need yet; monthly builds a habit and matches the pillar-per-month structure. |
| Live or recorded? | Live. The questions are the value, and the live format is what converts attendees into diagnostic enquiries. |
| Replay? | Yes, sent only to registered attendees, kept for 14 days. It rewards registration without becoming a free course library. |
| Platform? | Whatever you already pay for. Zoom is in the site's content security policy already; Teams and Google Meet work too. |
| Reminders? | Two: 24 hours before and 30 minutes before. Build them in GoHighLevel once the webhook is live. |
| What if nobody comes? | It happens. The attendee notes PDF and the replay still do the work, and the recording becomes an article or a chapter. |

**Mechanics:** registration posts to `/api/lead` with `form: "workshop"`, so attendees are tagged automatically. The `.ics` file is already on the site for anyone who wants it in their calendar (update the date inside `site/assets/downloads/team-iq-workshop.ics` when you move the schedule).

**Update the date in one place:** `config.js` → `workshop.nextDate`. Every reference on the site reads from it.

---

## 5. Automation: what actually needs to run

Nothing on the website needs a scheduled job. It is static files plus one synchronous endpoint. That is a feature: there is no cron to fail and no queue to back up.

The automations worth building all live in the CRM, once leads arrive:

| Automation | Trigger | What it does | Priority |
| --- | --- | --- | --- |
| Scorecard follow-up | `form = scorecard` | Sends the full written report, then a 3-day and 10-day nudge referencing the weakest pillar | High — this is your highest-volume lead |
| Workshop reminder | `form = workshop` | Joining link, 24-hour reminder, 30-minute reminder, replay afterwards | High |
| Board case download | `form = board-case` | Sends the benchmark and sample report, then one follow-up with the cost-of-inaction model | Medium |
| Diagnostic no-show | booking status | One rebook message, then stop | Medium |
| Post-diagnostic | deal stage | Proposal, then the 6-month credit reminder | Medium |
| Quarterly re-measure | programme end | Reminds the client, sends the scorecard link | Low until you have a cohort |

If you ever want something to run on a schedule **independent of the CRM** — a monthly summary email to yourself, for example — that is a Manus scheduled task, not something the website should carry.

---

## 6. Decisions still open

1. **GoHighLevel pipeline stages.** Until these are defined, leads will land in one place and go stale. Suggested: New → Scorecard completed → Workshop attended → Diagnostic booked → Proposal sent → Won / Lost.
2. **The workshop date for the first session.** Needed before the page goes live.
3. **Book: free chapters and print edition.** The form works now; the manuscript and the print-on-demand route are the open items.
4. **Analytics.** Deliberately not added. If you want it, a privacy-first option (Plausible, or Cloudflare Web Analytics, which is free) avoids a cookie banner entirely. Set `analytics.enabled` in `config.js` when you decide.
5. **Where the domain points.** Cloudflare Pages is ready; the DNS move is the last step and should happen after you have reviewed the site on a staging domain.