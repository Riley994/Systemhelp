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
✨ Read 91 files from the assets directory /home/ubuntu/teamiq/site
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