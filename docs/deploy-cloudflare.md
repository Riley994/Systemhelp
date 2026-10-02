# Deploying to Cloudflare

**The site is published by Cloudflare Pages.** There is no Worker any more.

---

## Where things stand (2 October, 15:26)

| | State |
| --- | --- |
| Worker `systemhelp` | **deleted** — which is why `systemhelp.riley-2e2.workers.dev` now answers `error code: 1042` on every path. Nothing was wrong with the code. |
| Pages project `systemhelp` | **exists**. `systemhelp.pages.dev` answers **522** on every path, which means no successful production deployment is serving it. |
| The last Pages build | **failed**: `Executing user command: pnpm run build` → `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`. There is no `package.json`, because there is nothing to compile. |
| `systemhelp.co.uk` | **does not resolve** — stale DNSSEC records at the registry. Separate problem, explained at the end. |

---

## The fix: two fields in the Pages project

Workers & Pages → **systemhelp** (the *Pages* project) → **Settings → Build configuration**

| Field | Set it to | Why |
| --- | --- | --- |
| Build command | **empty** — or the word `true` | There is nothing to compile. `pnpm run build` fails because the repository has no `package.json`. |
| Build output directory | `site` | That is where the website is. Left at the default, Pages publishes the repository root, which has no `index.html` at the top level. |

The output directory is also declared in `wrangler.jsonc` as `"pages_build_output_dir": "./site"`, so
Pages reads it from the repository. The build command is *not* in the repository — it only exists in
the dashboard, so it has to be cleared by hand.

Then **Deployments → Retry deployment**. A successful build ends with:

```
Success: Your site was deployed!
https://systemhelp.pages.dev
```

---

## Environment variables

Settings → **Environment variables** → add each one for **Production *and* Preview**, then redeploy
so the new values are picked up.

| Name | Type | Value |
| --- | --- | --- |
| `GHL_TOKEN` | Secret | GoHighLevel Private Integration token — see [gohighlevel-integration.md](gohighlevel-integration.md) |
| `GHL_LOCATION_ID` | Text | the GoHighLevel sub-account id |
| `RESEND_API_KEY` | Secret | optional — emails you every lead as a safety net |

---

## What Pages does with this repository

| Path | What it is |
| --- | --- |
| `site/` | The whole website. This is the build output directory. |
| `site/_headers` | Security and caching headers |
| `site/_redirects` | The old systemhelp.co.uk URLs, redirected so search rankings are kept |
| `site/_routes.json` | Declares that only `/api/*` invokes a Function, so every page view is a free, fast static request |
| `functions/api/lead.js` | `POST /api/lead` — the form endpoint |
| `functions/api/health.js` | `GET /api/health` — proves the Function layer is live |
| `shared/lead-delivery.js` | Where a lead goes: GoHighLevel, then the webhook, then the owner email |
| `wrangler.jsonc` | Pages reads the build output directory from here |
| `server/`, `tools/`, `book/`, `docs/` | Local development, the PDF renderer, the book. Never published. |

Nothing in `functions/` needs registering: Pages routes it by filename. A file or folder whose name
starts with `_` is not routed.

---

## Testing after it deploys

```sh
# 1. Is the Function layer live?
curl -s https://systemhelp.pages.dev/api/health
# → {"ok":true,"service":"team-iq","runtime":"pages","time":"..."}

# 2. Does a form submission travel all the way to GoHighLevel?
curl -s -X POST https://systemhelp.pages.dev/api/lead \
  -H 'Content-Type: application/json' \
  --data '{"form":"test","name":"Test Contact","email":"you@yourdomain.co.uk","submittedAt":"2026-10-02T12:00:00Z"}'
# → {"ok":true,"delivered":{"ghl":"created","ghlTags":"added","ghlNote":"added","crm":"skipped","email":"sent"}}
```

`ghl: "skipped"` means the GoHighLevel variables are not set yet. `ghl: "failed_401"` means the token
was rejected — wrong token, or the Private Integration is missing the **Contacts → Write** scope.

Then delete the test contact from GoHighLevel.

---

## Custom domains

**Custom domains → Set up a custom domain** → `systemhelp.co.uk`, then `www.systemhelp.co.uk`.

Pages creates a DNS record pointing at the project. If it reports a conflict, delete the old record
first: the Worker is gone, but the records it created may still be in the zone.

A custom domain cannot be verified until the domain resolves, so fix the DNSSEC problem below first.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `522` on `<project>.pages.dev` | No successful production deployment | Clear the build command, set the output directory to `site`, retry the deployment |
| Build fails, `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` | Build command is `pnpm run build` | Clear the Build command field |
| Build fails, `Missing entry-point` | The build command is `npx wrangler deploy` | That is a Workers instruction. Clear the Build command field. |
| Pages loads but page styles are missing | Output directory is the repository root | Set it to `site` |
| Pages loads but `/api/lead` returns 404 | The `functions/` folder was not bundled | The output directory must be `site` |
| Form says it sent, nothing arrives in GoHighLevel | Environment variables missing, or set only for Preview | Add them for **Production**, then redeploy |
| `error code: 1042` | The deleted Worker's hostname | Harmless. Use the Pages URL, or remove the hostname from the account. |
| `systemhelp.co.uk` will not load at all | DNSSEC — see below | The registrar has to clear it |

---

## The domain: stale DNSSEC records

Checked directly, at 15:26 on 2 October:

```
DS 51860 13 2 526026AE95C6A285EF72275B40CEE02AD8797A5836188E38C840F1C3BF025E4A
DS 33789 13 2 15C557399020FE46BC8BCFF20C13FAB089458420DE332CF49837F2A0FC63AE2A
```

Nominet's own registry record for the domain reports `secureDNS: delegated = true` with those two
records, and the registrar of record is **GoDaddy.com, LLC**. A validating resolver therefore returns
`SERVFAIL`; the domain only answers with validation switched off, which no visitor's browser does.

**Why GoDaddy's panel says DNSSEC is off.** GoDaddy only manages DNSSEC records while the domain uses
*their* nameservers. The domain now uses `arturo.ns.cloudflare.com` and `surina.ns.cloudflare.com`,
so GoDaddy's panel has nothing to show and no longer manages the record — but the two DS records
published earlier are still in the registry, and only the registrar of record can remove them.

Two ways to clear it. The first is free and immediate; the second costs a support ticket.

1. **Do it yourself, taking advantage of the outage you already have.** The domain is unresolvable
   right now, so there is nothing to lose:
   - In GoDaddy, set the nameservers back to GoDaddy's defaults.
   - When the panel offers DNSSEC again, switch it **off**. That removes the DS records.
   - Set the nameservers back to `arturo.ns.cloudflare.com` and `surina.ns.cloudflare.com`.
   - Leave DNSSEC off. Do not enable it in Cloudflare unless you also publish the matching DS record
     from Cloudflare's DNSSEC page at the registrar.
2. **Ask GoDaddy support** to remove the DS records with key tags **33789** and **51860** for
   `systemhelp.co.uk`. Quote the key tags; they are visible in GoDaddy's own records for the domain.

The DS record's TTL is 10 seconds, so resolution returns almost immediately once it is gone.

---

## Appendix — what the Worker was, and why it is gone

The repository originally shipped two routes to the same site, because Cloudflare's Git integration
creates a *Worker* while the site is a natural fit for *Pages*:

| | Workers | Pages |
| --- | --- | --- |
| Static site plus one API endpoint | works | works |
| Configuration | `wrangler.jsonc`, with the entry point and assets declared | the dashboard, plus `pages_build_output_dir` |
| The form endpoint | `worker/index.js` importing the shared handler | `functions/api/lead.js` |
| Custom domains | Domains & Routes | Custom domains |
| `_headers` / `_redirects` | supported | native |

Both hosted the site identically; the Worker was deleted on 2 October and Pages is now the platform.

One consequence worth recording, because it cost an afternoon of diagnosis: deleting a Worker leaves
its `workers.dev` hostname in place, pointing at nothing. Every request to it then returns
`error code: 1042` — *"Worker tried to fetch from another Worker on the same zone"* — **before any
code runs**, including for paths the script never handled. That is the fingerprint of a missing
deployment, not a code fault. If a hostname of yours ever answers that way, check whether the Worker
behind it still exists.