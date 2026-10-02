# Connecting the website to your GoHighLevel sub-account

The code is already in place. This document is the setup: what to create in GoHighLevel, what to
paste into Cloudflare, and how to prove it works.

## How a submission flows

```
visitor submits a form
        │
        ▼
POST /api/lead                      functions/api/lead.js  (a Cloudflare Pages Function)
        │  validate, honeypot, timing trap
        ▼
shared/lead-delivery.js             one place, used by Cloudflare and by the local server
        │
        ├─► 1. GoHighLevel direct API     GHL_TOKEN + GHL_LOCATION_ID
        ├─► 2. Generic webhook            CRM_WEBHOOK_URL
        └─► 3. Owner notification email   RESEND_API_KEY
```

Every destination is independent and optional. The visitor's submission never fails because a
downstream service is down — the outcome is returned in the response and logged if nothing got
through.

| Variable | What it is |
| --- | --- |
| `GHL_TOKEN` | Private Integration token from the sub-account |
| `GHL_LOCATION_ID` | the sub-account (location) id |
| `GHL_API_BASE` | optional — defaults to `https://services.leadconnectorhq.com` |
| `GHL_API_VERSION` | optional — defaults to `2021-07-28` |
| `GHL_CUSTOM_FIELDS` | optional JSON mapping a lead field to a GoHighLevel custom field id |
| `GHL_NOTES` | optional — set to `off` to stop writing the enquiry note |
| `RESEND_API_KEY` | optional but recommended — emails you every lead as a safety net |

## Step 1 — find the location id

Open the sub-account in GoHighLevel. The id is in the browser address bar:

```
https://app.gohighlevel.com/v2/location/XXXXXXXXXXXXXXXXXXXX/dashboard
                                       └──── this is the location id ────┘
```

If the account runs on a white-labelled domain, the address looks the same with a different host —
for example `https://app.guaranteedcrm.io/v2/location/XXXXXXXXXXXXXXXXXXXX/dashboard`. The id is
always the segment between `/location/` and `/dashboard`.

It is also listed against each sub-account in the agency view. Keep it to hand for step 3.

## Step 2 — create the Private Integration token

1. In the **sub-account**, go to **Settings → Private Integrations**.
   If you cannot see it, enable **Private Integrations** in **Labs** first — that is the usual
   reason it is missing.
2. **Create new Integration**. Name it something you will recognise later, for example
   `Systemhelp website`.
3. Scopes — select the minimum:
   - **Contacts → Write** — needed to create and update the contact, add tags and write the note
   - **Contacts → Read** — optional, useful if you later want the site to look a contact up

   Nothing else is needed, and the list is long. The site makes exactly three calls, and
   **Contacts → Write** covers all of them:

   | The site does this | Endpoint |
   | --- | --- |
   | creates or updates the contact | `POST /contacts/upsert` |
   | adds its tags | `POST /contacts/{id}/tags` |
   | writes the enquiry as a note | `POST /contacts/{id}/notes` |

   Leave every other scope unticked — calendars, conversations, opportunities, workflows, payments,
   funnels and the rest are not used by this site. A narrower token is easier to audit and safer to
   hold.
4. Create it and **copy the token immediately**. GoHighLevel shows it once; if you lose it you
   rotate rather than recover.

> Use a Private Integration token, not a legacy API key. The token is a static OAuth access token
> with a restricted scope, and you can rotate it or narrow its permissions later without changing
> any code.

## Step 3 — put both into Cloudflare

The site is published by Cloudflare Pages, so the variables belong to the Pages project:

**Workers & Pages → systemhelp (the Pages project) → Settings → Environment variables**

| Name | Type | Value |
| --- | --- | --- |
| `GHL_TOKEN` | **Secret** (encrypt) | the token from step 2 |
| `GHL_LOCATION_ID` | Text | the id from step 1 |
| `RESEND_API_KEY` | Secret (encrypt) | optional, the safety-net email |

> **The names must match exactly.** The code reads `GHL_TOKEN` and `GHL_LOCATION_ID`, and
> environment variable names are case-sensitive. A variable named `GHL_systemhelp_Token` is
> invisible to the site, and every submission would still come back `skipped`. The *integration's*
> name inside GoHighLevel is only a label — call that whatever you like; it is its **value** that
> goes into `GHL_TOKEN`.

Add each variable **twice — once under Production and once under Preview** — because the dashboard
keeps those environments separate, and a variable set only for Preview is not visible to the live
site. Then **Deployments → Retry deployment**. Environment variables are read when a deployment is
built, so they only take effect on the next one. They survive future Git builds: you set them once.

If you would rather do it from a terminal, from a clone of the repository with your Cloudflare
login:

```sh
npx wrangler pages secret put GHL_TOKEN --project-name systemhelp
npx wrangler pages secret put RESEND_API_KEY --project-name systemhelp
```

`GHL_LOCATION_ID` is not sensitive, so it can go in the same dashboard page as plain text.

## Step 4 — test it

Send one submission to the live endpoint:

```sh
curl -s -X POST https://systemhelp.co.uk/api/lead \
  -H 'Content-Type: application/json' \
  --data '{"form":"test","name":"Test Contact","email":"you@yourdomain.co.uk","company":"Test Ltd","submittedAt":"2026-10-02T12:00:00Z"}'
```

A working connection answers:

```json
{"ok":true,"delivered":{"ghl":"created","ghlTags":"added","ghlNote":"added","crm":"skipped","email":"sent"}}
```

- `ghl: "created"` — a new contact; `"updated"` means GoHighLevel matched an existing one
- `ghl: "failed_401"` — the token was rejected: wrong token, or the scope is missing
- `ghl: "config_incomplete"` — the token is set but `GHL_LOCATION_ID` is not
- `ghl: "skipped"` — no token configured yet

Then open **Contacts** in the sub-account and search for the email address. You should see the
contact with the tags below and a note holding the full enquiry.

**Delete the test contact afterwards**, so it does not pollute your pipeline.

## What lands in GoHighLevel

Contact fields:

| Website field | GoHighLevel |
| --- | --- |
| name | `firstName`, `lastName` and `name` |
| email | `email` — this is what GoHighLevel matches on |
| phone | `phone` |
| company | `companyName` |
| form | `source`, as `systemhelp.co.uk — <form>` |

Tags, added *in a second call* so that nothing already on the contact is lost:

| Tag | Meaning |
| --- | --- |
| `website-lead` | every submission from this site |
| `form-scorecard` | which form — also `form-workshop`, `form-book`, `form-diagnostic-enquiry`, `form-board-case`, `form-enquiry` |
| `iq-band-emerging` | scorecard band: reactive, emerging, developing, strong, exemplary |
| `iq-score-58` | the raw score, so you can segment on a number |
| `weakest-shared-clarity` | the pillar the scorecard identified as weakest |
| `team-60-200` | the team-size band they selected |

> Why tags are not sent with the contact: the upsert endpoint's `tags` field **overwrites every tag
> on the contact**. Sending them there would silently wipe tags your workflows depend on. The
> separate Add Tag call is additive, so a returning visitor keeps their history.

The note on the contact carries the free text — role, area of concern, score, pillar breakdown —
where the person picking the lead up will actually look for it.

## Optional — your own custom fields

If you want the score and pillar scores in proper GoHighLevel fields rather than a note:

1. Create the field: **Settings → Custom Fields → Add Field** (contact type).
2. Get its id: open the field to edit, and read the id from the URL.
3. Add a variable, `GHL_CUSTOM_FIELDS`, containing JSON that maps the website's field name to that
   id:

```json
{"score":"aBc123DeF456","weakestPillar":"gHi789JkL012","pillarScores":"mNo345PqR678"}
```

The website's field names are `score`, `weakestPillar`, `pillarScores`, `company`, `role`,
`teamSize`, `interest`, `message`. Anything you map is sent as a custom field as well as appearing
in the note.

## The email safety net (Resend)

Add `RESEND_API_KEY` and every lead is emailed to you at the same moment it reaches GoHighLevel.
Two independent destinations: if one breaks, the other still carries the enquiry, so a broken
integration becomes a duplicate rather than a lost lead.

1. **Sign up at [resend.com](https://resend.com)** — the free tier covers 3,000 emails a month, 100 a
   day. The address you sign up with is only your login and billing identity. It has nothing to do
   with the sending domain or with where leads are emailed, so any address you actually read is fine.
2. **Add the domain: Domains → Add domain → `systemhelp.co.uk`.** Resend sends from the subdomain
   `send.systemhelp.co.uk`, so this does **not** touch the MX records that deliver your own mail.
3. **Add the records it lists, in Cloudflare DNS.** All are **DNS only**; never proxied. This account
   is on Resend's newer scheme, where SPF and DKIM are delegated by CNAME rather than published as
   records of their own:

   | Type | Name | Value |
   | --- | --- | --- |
   | CNAME | `send.send` | `send.forge.rmta.net` |
   | CNAME | `rsend.send` | `rsend-euw1.forge.rmta.net` |
   | TXT | `resend._domainkey.send` | `p=MIGfMA0GCSq…` — the long public key |

   Names are shown relative to `systemhelp.co.uk`, so `send.send` means `send.send.systemhelp.co.uk`.
   Copy the Name and Value exactly as the dashboard shows them. Older accounts get a different set —
   an MX and an SPF TXT on `send`, plus `resend._domainkey` — so follow the table in front of you,
   not this one.

   Read the **Status** column in Resend's records table rather than the domain status at the top: it
   marks each record individually, so it names the one that is still outstanding. A domain can also
   sit at *pending* with every record correct and resolving, purely because Resend has not run its
   next check yet.
4. **Check they are really there before believing the dashboard.** Cloudflare is authoritative for the
   zone, so a correct record resolves immediately; a long wait means the record is not in this zone,
   not that it is propagating:

   ```sh
   dig +short TXT   resend._domainkey.send.systemhelp.co.uk @1.1.1.1   # the public key
   dig +short CNAME send.send.systemhelp.co.uk @1.1.1.1                # send.forge.rmta.net
   dig +short CNAME rsend.send.systemhelp.co.uk @1.1.1.1               # rsend-euw1.forge.rmta.net
   ```

   Once all three resolve, what remains is Resend's own scheduled check: the domain page has a verify
   action to force it. The "1 hour" in Cloudflare's TTL column is cache lifetime, not a waiting
   period, and does not delay verification.
5. **Wait for the domain to read Verified.** A send from an unverified domain is refused with `403`
   and the message "domain is not verified".
6. **API Keys → Create API key**, sending access only, and copy the `re_…` value — it is shown once.
   Creating the key before the domain verifies is fine; it simply cannot send until then. A
   sending-only key cannot read the domain list, so `GET /domains` answers `401` with it: that is the
   restriction working, not a fault.
7. **In Cloudflare**, the Pages project → Settings → Environment variables → add `RESEND_API_KEY` as
   a **Secret** under both **Production** and **Preview**, then **Deployments → Retry deployment**.
   This can be done before verification finishes: leads keep reaching GoHighLevel and only the email
   is held back.

| Variable | Default | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | — | absent means no email is sent |
| `LEAD_NOTIFY_EMAIL` | `andrew@systemhelp.co.uk` | one address, or several separated by commas |
| `LEAD_FROM_EMAIL` | `website@systemhelp.co.uk` | must sit on the domain verified in Resend |

If the domain is not verified the send is refused and the response reports `"email":"failed_403"`.

## The alternative — inbound webhook instead of a token

If you would rather not hold a token at all, set `CRM_WEBHOOK_URL` to a GoHighLevel inbound webhook
instead:

1. **Automation → Workflows → Create Workflow → Add Trigger → Inbound Webhook**
2. Copy the webhook URL, and set it as `CRM_WEBHOOK_URL` on the Pages project.
3. In that workflow, add an action to **Create/Update Contact** and map the incoming fields.

One thing to know before choosing this route: an inbound webhook trigger does **not** create a
contact on its own, and it does not automatically promote the incoming fields into contact fields.
The workflow has to do both. That is why the direct API is the primary path here — it creates the
contact, the tags and the note without you having to build anything in the workflow builder.

## When something is wrong

Nothing is lost quietly. If a lead reaches no destination at all, the server logs the whole payload:

```
[lead] not delivered downstream {"results":{...},"lead":{...}}
```

- **Cloudflare:** Workers & Pages → systemhelp → Logs (live tail), or **Observability** for history
 - **Locally:** the terminal running `node server/server.mjs`

Two answers mean the submission was deliberately ignored rather than delivered. Both are logged with
the reason, so the log says which trap fired:

- `{"ok":true,"note":"ignored_fast"}` — completed in under two seconds, measured from the moment the
  form appeared (`startedAt`), not from the submit.
- `{"ok":true,"note":"ignored_honeypot"}` — the hidden trap field was filled, which a browser
  password manager can do on autofill.

A wrong or expired token logs `[lead] GoHighLevel rejected the token — check GHL_TOKEN and its
scopes`. Set `RESEND_API_KEY` as well and you also get an email for every lead, so a broken
integration is a duplicate rather than a lost enquiry.

## The funnel work this unlocks

The tags are designed so that GoHighLevel does the routing rather than you:

- `form-scorecard` + `iq-band-emerging` → a nurture sequence that ends in the diagnostic offer
- `form-diagnostic-enquiry` → notify you, create the opportunity in a pipeline, send the calendar
  link
- `form-book` → workshop registrations, with the monthly reminder sequence
- `form-board-case` → the internal-champion track: send the business case PDF, then a check-in

Because the score and weakest pillar are on the contact, a workflow can reference them directly —
"your weakest area is shared clarity" lands far better than a generic follow-up.

## Booking

You already own a scheduler inside GoHighLevel, so there is no reason to pay for a separate booking
tool. Create the calendar in the sub-account, then put its link into the site's settings file:

```js
// site/assets/js/config.js
booking: {
  embedUrl: "https://api.leadconnectorhq.com/widget/booking/XXXXXXXX",
  linkUrl:  "https://api.leadconnectorhq.com/widget/booking/XXXXXXXX"
}
```

`embedUrl` renders the calendar inline on the diagnostic page; `linkUrl` is the plain link used by
buttons everywhere else. That single change replaces every "book a call" placeholder on the site.

## Security

- Rotate the token every 90 days (**Private Integrations → Rotate**). GoHighLevel keeps the old and
  new tokens working for a 7-day window, so you can rotate without downtime.
- Never commit the token. It belongs in Cloudflare's secret store, not in the repository — the
  repository is public.
- Grant only Contacts write and read. If the token leaks, that is the entire blast radius.

Until these exist, every submission is accepted and delivered nowhere. The endpoint answers
`"skipped"` for each destination, which is what the live site does today: the visitor sees the
thank-you message, and no lead reaches GoHighLevel or your inbox.
- **Cloudflare:** `npx wrangler pages deployment tail --project-name systemhelp`, or the deployment's
  log view in the dashboard. The tail is the quickest way to watch a submission arrive and see which
  destination it reached.
