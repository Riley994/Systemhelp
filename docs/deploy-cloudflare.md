# Deploying to Cloudflare

## Did the settings you entered work?

**No — and they could not have.** The screen you were on was Cloudflare's **Workers** Git integration, whose default deploy command is:

```
npx wrangler deploy
```

That command reads a `wrangler.jsonc` file from the repository to know *what* to deploy. The repository did not have one, so the build will have failed with something like:

```
✘ [ERROR] Missing entry-point to Worker script or to assets directory
```

There is nothing you did wrong. Cloudflare has two products that can host this site and they want different things:

| | **Workers** (the screen you saw) | **Pages** (the classic one) |
| --- | --- | --- |
| Deploy command | `npx wrangler deploy` — needs `wrangler.jsonc` | none; you point it at a folder |
| Where the form endpoint lives | a Worker script | a `functions/` folder |
| Preview per branch | yes | yes |

The repository now supports **both**. Pick one route below and stick to it.

---

## Route A — Workers (you are already here)

I have added the two files that make your existing setup work. Nothing else changes.

**What was added**

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Tells Cloudflare that `./site` is the website and `worker/index.js` is the script |
| `worker/index.js` | Routing only — it imports the *same* lead handler the Pages version uses, so there is still one copy of that logic |

**What to do**

1. Push the change (already done if you are reading this from the latest `main`).
2. In the Cloudflare dashboard, open your Worker → **Deployments** (or the build you created) → **Retry build**.
3. Leave the settings exactly as they are:
   - Build command: **None**
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
4. Watch the log. A successful build ends with something like:

```
✨ Read 91 files from the assets directory ./site
Total Upload: 4.59 KiB / gzip: 1.76 KiB
Uploaded systemhelp (x.x sec)
Deployed systemhelp triggers (x.x sec)
  https://systemhelp.<your-subdomain>.workers.dev
```

That URL at the end is your live site.

> **If the Worker name in your dashboard is not `systemhelp`**, either rename the Worker to `systemhelp` or change `"name"` in `wrangler.jsonc` to match. If the names differ, Cloudflare will quietly deploy a *second* Worker and you will be editing the wrong one.

---

## Route B — Cloudflare Pages (the simpler alternative)

If you would rather not deal with Workers, Pages is fewer moving parts, because the repository already contains the `functions/` folder that Pages picks up automatically.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
2. Choose `Riley994/Systemhelp`.
3. Settings:

| Setting | Value |
| --- | --- |
| Project name | `systemhelp` |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | *(leave empty)* |
| Build output directory | `site` |
| Root directory | *(leave empty)* |

4. **Save and Deploy**. You get a `systemhelp.pages.dev` URL.

Do not set a build command. There is nothing to compile — the HTML in `site/` is the finished website.

---

## How to test the deployment

### 1. Did the build succeed?

Dashboard → your project → **Deployments** → click the newest one. You want a green *Success* and a deployment URL. If it failed, open the log and look for the first line beginning with `✘`. Anything about `wrangler`, `entry-point`, or `assets` means the config did not reach the repository — check that `wrangler.jsonc` is committed on `main`.

### 2. Does the site answer?

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-URL/
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-URL/board-case/
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-URL/assets/css/site.css
```

All three should print `200`.

### 3. Does the branded 404 work?

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-URL/no-such-page/
```

Expect `404`, and in a browser that page shows your design, not Cloudflare's default.

### 4. Does the form endpoint work?

```bash
curl -s -X POST https://YOUR-URL/api/lead \
  -H 'Content-Type: application/json' \
  -d '{"form":"test","name":"Cloudflare Test","email":"test@example.com","submittedAt":"2026-01-01T00:00:00Z"}'
```

Expected:

```json
{"ok":true,"delivered":{"crm":"skipped","email":"skipped"}}
```

`skipped` is correct until you add the environment variables below. Then try a deliberate mistake:

```bash
curl -s -X POST https://YOUR-URL/api/lead -H 'Content-Type: application/json' -d '{"name":"","email":"nope"}'
```

Expect `{"ok":false,"error":"invalid_fields","fields":["name","email"]}`.

Finally, submit a real form in the browser and confirm you land on the thank-you page.

### 5. Check the whole site

Walk through the main pages once on the live URL: home, why-team-iq, how-it-works, board-case (run the calculator), scorecard (complete it), workshop, diagnostic-session, pricing, results, book, about-us, contact-page, privacy, terms, cookies. Also open the site on a phone.

---

## Environment variables (needed before the forms are useful)

Without these, submissions are accepted and shown the thank-you page, but nothing is delivered anywhere.

**Workers** → your Worker → **Settings** → **Variables and Secrets** → add for Production:

| Name | Value | Notes |
| --- | --- | --- |
| `CRM_WEBHOOK_URL` | your GoHighLevel inbound webhook | optional but recommended |
| `RESEND_API_KEY` | your Resend key | optional; free tier covers 3,000 emails/month |
| `LEAD_NOTIFY_EMAIL` | `andrew@systemhelp.co.uk` | default if omitted |
| `LEAD_FROM_EMAIL` | a verified sender, e.g. `website@systemhelp.co.uk` | default if omitted |

**Pages** → your project → **Settings** → **Environment variables**, same four names, set for **Production** and **Preview**.

Mark `RESEND_API_KEY` as a **secret**, not plain text. After adding variables, redeploy so they take effect.

See `docs/funnel-and-tech-options.md` for what to do with the leads once they arrive.

---

## Pointing systemhelp.co.uk at it

Only after the site looks right on the temporary URL.

1. In the Cloudflare project: **Settings** → **Domains and Routes** → **Add** → `systemhelp.co.uk`, then `www.systemhelp.co.uk`.
2. If the domain's DNS is not yet on this Cloudflare account, move it first (change the nameservers at your registrar, or transfer the zone). The account you are using already exists under `Riley@rp-racing.co.uk`; the `systemhelp.co.uk` zone can simply be added to it.
3. Cloudflare issues the TLS certificate automatically. `site/_redirects` already sends the old addresses to the new pages, and `site/_headers` sets caching and security headers.

Nothing else in the repository needs to change when the domain moves.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build fails: `Missing entry-point` | `wrangler.jsonc` not on the deployed branch | Commit and push it; confirm it is visible on GitHub |
| Build succeeds but the URL shows "Hello World" | The Worker has its own default script instead of this repository's | Confirm `"main": "worker/index.js"` and that the build log shows the asset count |
| Site loads but every page is 404 | `assets.directory` cannot see the files | Check the log line `Read N files from the assets directory`; it should say about 91 |
| Form submits, then nothing arrives | Environment variables not set, or set only for Preview | Add them for **Production** and redeploy |
| `/api/lead` returns HTML instead of JSON | The request never reached the Worker | Confirm `run_worker_first` contains `"/api/*"` in `wrangler.jsonc` |
| Two Workers appear in the dashboard | The `"name"` in `wrangler.jsonc` differs from the project name | Rename one so they match, then delete the stray Worker |

## Error 1042 on every path

**Symptom.** Every request — pages, stylesheets, even the API — returns a 17-byte `text/plain`
body reading `error code: 1042`, and the Worker's own code never runs.

**What it means.** 1042 is *"Worker tried to fetch from another Worker on the same zone"*. It is
raised before your script executes, so it is always a configuration problem, never a bug in
`worker/index.js`. There are two known causes:

1. **A Workers bug.** When preview URLs are enabled and `workers.dev` is disabled, the platform
   returns 1042 pre-execution for every path on the Worker. Fix: declare the hostnames explicitly
   in `wrangler.jsonc` and redeploy.

   ```jsonc
   "workers_dev": true,
   "preview_urls": false,
   ```

2. **The same hostname claimed twice.** `systemhelp.co.uk` attached as a *Custom Domain* in the
   dashboard **and** covered by a *route pattern* such as `systemhelp.co.uk/*` — including the
   `routes` block in `wrangler.jsonc` if it has been uncommented. Two claims on one hostname
   conflict. Open **Workers & Pages → systemhelp → Settings → Domains & Routes** and keep one.

**How to tell which one you have.** The health probe never touches the assets binding, so it
isolates the two:

```sh
curl -s https://systemhelp.riley-2e2.workers.dev/api/health
```

- JSON back (`{"ok":true,...}`) — the Worker is running and the fault is in static file serving.
- `error code: 1042` — the Worker never started. It is a hostname or route configuration problem:
  work through the two causes above.

**Pages is the fallback.** If you would rather not fight the Worker configuration, the same
repository runs on Cloudflare Pages unchanged — see the next section.

## Running the same site on Cloudflare Pages instead

Nothing in the code is Worker-specific. The repository already carries what Pages needs:
`functions/api/lead.js` is a Pages Function, and `site/_headers` and `site/_redirects` are Pages
features.

1. **Workers & Pages → Create → Pages → Connect to Git**, pick `Riley994/Systemhelp`.
2. Build command: leave empty (or `true`). Build output directory: `site`.
3. Environment variables, in the Pages project this time: `GHL_TOKEN`, `GHL_LOCATION_ID`,
   `RESEND_API_KEY` — the same names and values as the Worker.
4. **Custom domains → Set up a domain** → `systemhelp.co.uk`, then `www.systemhelp.co.uk`.

Which to choose:

| | Workers | Pages |
| --- | --- | --- |
| Static site + one API endpoint | Yes | Yes |
| Config lives in the repository | `wrangler.jsonc` | Dashboard only |
| Custom domains | Domains & Routes | Custom domains tab |
| `_headers` / `_redirects` | Supported | Native |
| Failure mode seen here | Route/hostname conflicts (1042) | None equivalent |
| Platform direction | Where Cloudflare is investing | Maintained, not the focus |

Both are free at this traffic level. Workers is the platform Cloudflare is actively developing;
Pages is the simpler mental model with fewer moving parts. Either serves this site identically.

## Finishing the Pages setup

`systemhelp.pages.dev` already exists. It answers with Cloudflare's **522 "connection timed out"**
on every path, which means the project has no production deployment serving it yet — nothing to do
with the code. Four settings finish it.

**1. Build configuration** — Workers & Pages → systemhelp (the Pages project) → Settings → Build
configuration:

| Setting | Value |
| --- | --- |
| Build command | leave **empty** |
| Build output directory | `site` |

Leave the build command empty: there is nothing to compile, the site is already HTML, CSS and
JavaScript. Do **not** put `npx wrangler deploy` there — that is a Workers instruction, and it
belonged to the Worker, which no longer exists. If the output directory is left at the default,
Pages publishes the repository root, which has no `index.html` at the top level.

**2. Environment variables** — Settings → Environment variables, set for **Production and
Preview**:

| Name | Type | Value |
| --- | --- | --- |
| `GHL_TOKEN` | secret | GoHighLevel Private Integration token |
| `GHL_LOCATION_ID` | text | the sub-account id |
| `RESEND_API_KEY` | secret | optional — the safety-net lead email |

**3. Deploy** — Deployments → **Retry deployment**. A successful build ends with the site published
and the 522 gone. The build is only: clone, publish `site`, bundle `functions/`. No install step and
no dependencies.

**4. Custom domains** — Custom domains → Set up a custom domain → `systemhelp.co.uk`, then
`www.systemhelp.co.uk`. If Pages reports a conflicting DNS record, delete the old one first: the
Worker is gone, but the records it created may still be in the zone.

### Only `/api/*` should run the Function

`site/_routes.json` declares that only `/api/*` invokes the Function:

```json
{ "version": 1, "include": ["/api/*"], "exclude": [] }
```

Everything else is then served as a static asset, which is faster and does not consume a Functions
invocation for every page view.

### If the build cannot resolve the shared module

Pages bundles each Function, and imports from outside the `functions` directory are supported. If a
build ever reports `Could not resolve "../../shared/lead-delivery.js"`, move that file to
`functions/_shared/lead-delivery.js` — a leading underscore keeps it out of the routing table — and
update the two imports in `functions/api/lead.js` and `server/server.mjs`.

### The Worker files are now unused

`wrangler.jsonc` and `worker/index.js` existed only for the Workers route. They are harmless — Pages
ignores them — but they can be deleted if you would rather the repository describe one platform.
