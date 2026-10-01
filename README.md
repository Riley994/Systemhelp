# TEAM IQ Creator — website

A fast, static website for the TEAM IQ Creator course and the Systemhelp business. No build step, no framework, no compilation: the files in `site/` are the website. Open them, edit them, save them, deploy them.

- **Live site:** https://systemhelp.co.uk
- **Repository:** https://github.com/Riley994/Systemhelp
- **Hosting:** Cloudflare Pages (with a Manus-hosted fallback, see *Deploying*)

---

## 1. Quick start

```bash
# serve the site locally at http://localhost:3000
node server/server.mjs
```

Then open <http://localhost:3000>. That is the whole development setup — Node 22 or newer, no `npm install`.

To edit the site, open any file in `site/` in your editor. Reload the browser to see the change. Nothing needs rebuilding.

---

## 2. How the project is laid out

```
site/                         ← the published website. Anything in here is public.
├── index.html                ← homepage
├── why-team-iq/index.html    ← one folder per page; the folder name is the URL
├── how-it-works/index.html
├── board-case/index.html     ← the page that arms your internal champion
├── scorecard/index.html      ← the free 24-statement assessment
├── workshop/index.html
├── book/index.html
├── diagnostic-session/index.html
├── corporate-diagnostic/index.html
├── programme/index.html
├── pricing/index.html
├── results/index.html
├── about-us/index.html
├── contact-page/index.html
├── insights/                 ← index + one folder per article
├── privacy-policy/  terms/  cookies/
├── thank-you/                ← thank-you/workshop, /book, /diagnostic, /download
├── 404.html
├── favicon.svg  apple-touch-icon.png
├── robots.txt  sitemap.xml  manus-routes.json
├── _headers                  ← Cloudflare caching and security headers
├── _redirects                ← Cloudflare redirects from the old site's URLs
└── assets/
    ├── css/site.css          ← EVERY style rule for the entire site, in one file
    ├── js/config.js          ← prices, dates, contact details, feature switches
    ├── js/site.js            ← header menus, form submission, scroll reveals
    ├── js/scorecard.js       ← the assessment and its scoring
    ├── js/board-case.js      ← the cost-of-inaction calculator
    ├── img/                  ← photography, logos, generated artwork
    ├── fonts/                ← self-hosted Inter
    └── downloads/            ← the PDFs and the calendar file

server/server.mjs             ← local + Manus server: serves site/, handles /api/lead
functions/api/lead.js         ← the same endpoint as a Cloudflare Pages Function

tools/                        ← development only, never published
├── render-assets.mjs         ← regenerates the share image and the PDFs
audit-contrast.py          ← measures every text colour against its real background
└── templates/                ← the HTML that produces those PDFs

Dockerfile                    ← only used by Manus container hosting
app.config.ts                 ← Manus project thumbnail (not part of the website)
```

**Rule of thumb:** anything you want the public to see goes in `site/`. Everything else is tooling.

---

## 3. The edits you will actually want to make

### Prices

All prices live in **`site/assets/js/config.js`** *and* in the page HTML. The config file drives the calculator and any element marked `data-price`; the page text is plain HTML so search engines and AI assistants can read it.

| What to change | Where |
| --- | --- |
| Diagnostic session price (£1,200) | `site/assets/js/config.js` → `pricing.diagnosticSession`, and search the site for `1,200` |
| Programme price (from £45,000) | `config.js` → `pricing.programme`, and search for `45,000` |
| All prices, in one table | `site/pricing/index.html` |
| The recommended offer on the homepage | `site/index.html`, the section labelled `THE OFFERS` |

> After changing a price, search the whole `site/` folder for the old number — it appears in the navigation, the pricing page, several cards and the PDFs in `tools/templates/`. Re-run the PDF build (section 5) afterwards.

### Workshop dates

`config.js` holds `workshop.nextDate`, `workshop.cadence` and `workshop.time`. Anything in the HTML with `data-workshop-date` or `data-cfg="workshop.time"` is filled in automatically from that file, so you only change it in one place. To bump the date, edit `config.js` and commit.

### Contact details

`config.js` → `contact.email`, `contact.phone`, `contact.company`. These fill every element marked `data-cfg="contact.email"` and every mailto link marked `data-cfg-href="contact.email@mailto"`.

Adding a value in `config.js` and a matching `<span data-cfg="contact.yourKey">` in a page is the whole mechanism. There is no build step and nothing to compile.

### Company details (already set)

| Field | Value | Where it appears |
| --- | --- | --- |
| Legal entity | Network Advansys Limited | Footer of every page, terms, privacy policy, structured data |
| Trading names | Systemhelp, TEAM IQ Creator | Footer, terms, privacy policy |
| Company number | 3503850 | Footer, terms, privacy policy, cookies, contact page |
| Registered office | 49 Station Road, Polegate, East Sussex, England, BN26 6EA | Footer, terms, privacy policy, cookies, contact page |
| Phone | 07388 878732 | Contact page; the `tel:` link uses `+447388878732` so it works from abroad |

All of these come from `config.js`, so a change of address, number or trading name is a one-line edit.

### Text, headings and images

They are plain HTML. To make a word bold, wrap it in `<strong>…</strong>`. To make it a link, use `<a href="/pricing/">…</a>`. To swap an image, drop the new file into `site/assets/img/` and change the `src`.

### Turning things on and off

`config.js` starts with feature switches: `booking.provider` (leave as `"none"` to use the email fallback, set to `"calendly"` or `"calcom"` and fill in the URL to switch to a real calendar), `booking.calendlyUrl`, `stripe.links.*` for payment links, and `analytics.enabled`.

---

## 4. Forms — where the leads go

Every form on the site posts JSON to **`/api/lead`**. There are two identical implementations:

- `server/server.mjs` — used locally and on Manus hosting
- `functions/api/lead.js` — used automatically by Cloudflare Pages

The endpoint validates the submission, then:

1. forwards it to a CRM webhook (if `CRM_WEBHOOK_URL` is set), and
2. emails you a copy (if `RESEND_API_KEY` is set).

If neither is configured, the lead is written to the server log instead — so nothing is ever silently lost, and the visitor always sees the thank-you page.

### Cloudflare Pages setup

In the Cloudflare dashboard: **Workers & Pages → your Pages project → Settings → Variables and Secrets**, add these for **Production** and **Preview**:

| Variable | What it is | Example |
| --- | --- | --- |
| `CRM_WEBHOOK_URL` | A GoHighLevel inbound webhook URL (or Zapier/Make) | `https://services.leadconnectorhq.com/hooks/…` |
| `RESEND_API_KEY` | A Resend API key, so leads are also emailed to you | `re_…` |
| `LEAD_NOTIFY_EMAIL` | Where the notification goes | `andrew@systemhelp.co.uk` |
| `LEAD_FROM_EMAIL` | A sender you have verified in Resend | `website@systemhelp.co.uk` |

The GoHighLevel route is the cheapest and simplest: create one **inbound webhook** in your sub-account, map the fields (`name`, `email`, `company`, `message`, `score`, `weakestPillar`), and it becomes a contact with the right pipeline stage automatically. See `docs/funnel-and-tech-options.md` for the comparison you asked for.

---

## 5. Regenerating the share image and the PDFs

The downloads (business case, sample diagnostic report, benchmark, workshop notes) and the social share image are generated from HTML templates so that the typography matches the site exactly.

```bash
node tools/render-assets.mjs          # everything
node tools/render-assets.mjs images   # just the share image and icons
node tools/render-assets.mjs pdf      # just the PDFs
```

Requires Chromium on the PATH. Edit the wording in `tools/templates/*.html`, re-run, and the new PDFs appear in `site/assets/downloads/`.

---

## 6. Deploying to Cloudflare

Cloudflare has two products that can host this site, and the repository now supports both. **Full instructions, testing commands and a troubleshooting table are in [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md).** In short:

**Workers** — what the dashboard offers by default when you connect a Git repository. The deploy command is `npx wrangler deploy`, which reads `wrangler.jsonc`. Leave every setting at its default:

| Setting | Value |
| --- | --- |
| Build command | None |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

`wrangler.jsonc` publishes `site/` as static files and sends `/api/*` to `worker/index.js`.

**Pages** — fewer moving parts, and what the repository was shaped for. **Workers & Pages → Create → Pages → Connect to Git**, pick `Riley994/Systemhelp`, then:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `site` |

`site/_headers`, `site/_redirects` and `functions/api/lead.js` are then picked up automatically.

Either way, because there is no build step, every deploy is a straight file copy and each one takes seconds. Add the environment variables from section 4 before the forms can deliver anywhere.

When you are ready, move `systemhelp.co.uk` onto the project: **Settings → Domains**, then point DNS at Cloudflare. Keep the old site live until the new one resolves.

### Deploying on Manus instead (already configured)

This repository is also wired for Manus hosting: `build` publishes the static files in `site/`, and the container in `Dockerfile` serves `/api/lead` and `/api/health` on port 3000. Publishing a checkpoint from Manus will produce a working site with forms enabled. Both hosts work from the same files.

---

## 7. What still needs doing before launch

In priority order:

1. **Confirm the portrait** used for Andrew on `/about-us/` (the file is `site/assets/img/team-andrew.webp`; an HTML comment marks it). The name and role are confirmed — the photograph itself needs a check.
2. **Have a solicitor review** the privacy policy and terms of business. They now carry the correct legal entity, company number and registered office, but they have not been legally reviewed.
3. **Confirm the VAT registration number.** It is deliberately not on the site, because the site quotes prices excluding VAT rather than charging on the site. Add it to the terms and to your invoice template if you want it shown.
4. **Connect the booking calendar.** Set the URL in `config.js` → `booking`; until then the page shows an email fallback.
5. **Set the next workshop date** in `config.js` → `workshop.nextDate`, and in `site/assets/downloads/team-iq-workshop.ics`.
6. **Add Stripe payment links** to `config.js` once the Stripe account is live.
7. **Restore the quotes section on `/results/`** when your first cohort agrees in
   writing to be named. It was removed on 1 October 2026 because three empty
   spaces read as placeholders. The markup is in git history —
   `git show 5a8902c:site/results/index.html` — and the sections after it will
   need renumbering when it goes back.
8. **Publish the book** — the three free chapters need a real download once the manuscript is final.

---

## 8. How to keep it fast

The site is built to stay quick as you add to it:

- One stylesheet, one small script file per feature, no framework and no build.
- Fonts are self-hosted and subset to the characters used, so there is no third-party request on first paint.
- Images are WebP. Keep new images under about 150 KB and always give `width` and `height` attributes so the layout does not jump.
- Add `loading="lazy"` to any image that is not near the top of the page.
- If you add a new page, also add it to `site/sitemap.xml` and `site/manus-routes.json`.

---

## 9. Accessibility and SEO, already done

- Semantic landmarks, one `<h1>` per page, a skip link, and visible focus states.
- Every page has a title, a description, a canonical URL and Open Graph tags.
- `Organization`, `FAQPage`, `Course`, `Event`, `Book` and `Article` structured data where relevant.
- Thank-you pages and `404.html` are `noindex`; everything public is allowed in `robots.txt`.
- The old site's URLs redirect to their new equivalents via `site/_redirects`, so existing search rankings are not thrown away.

---

*Built and maintained with Manus. The site is ordinary HTML, CSS and JavaScript — any web developer can pick it up without a handover document longer than this one.*
worker/index.js               ← the same endpoint, wired for Cloudflare Workers
wrangler.jsonc                ← Cloudflare Workers deploy settings (site + /api/*)
