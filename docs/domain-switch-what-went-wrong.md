# The domain switch: what went wrong, and the two things to fix

Diagnosed live on 2 October 2026 from DNS queries. Nothing here is a guess.

## What is actually happening

**The nameserver change worked.** `systemhelp.co.uk` is now delegated to Cloudflare:

```
arturo.ns.cloudflare.com
surina.ns.cloudflare.com
```

The zone is live and Cloudflare answers authoritatively for it (the SOA comes from
`arturo.ns.cloudflare.com`). So this is not a propagation delay, and it is not a problem with the
switch itself.

**The domain is failing DNSSEC validation.** Cloudflare's own resolver reports:

```
EDE(9): DNSKEY Missing — no SEP matching the DS found for systemhelp.co.uk
```

The `.co.uk` registry is holding two DS records for the domain:

```
key tag 33789   algorithm 13   digest type 2
key tag 51860   algorithm 13   digest type 2
```

Neither matches a key-signing key that the zone publishes. **These are left over from the
previous DNS provider.** A nameserver change does not remove DS records: they live in the parent
zone, and only the registrar can change them. This is the standard failure when a domain that had
DNSSEC enabled is moved to a different DNS provider without clearing the old keys.

**The consequence.** Every DNSSEC-validating resolver — Google's 8.8.8.8, Cloudflare's 1.1.1.1, and
most ISPs — returns `SERVFAIL` for systemhelp.co.uk. The domain does not resolve at all for a large
part of the internet. Where it *does* resolve, it is a non-validating resolver or a cached answer,
and those still hold the old records. **That is why the old site is still what appears** — you are
seeing a cached or unvalidated answer, not the real state of the domain.

## The second problem, which would have appeared next

Even once DNSSEC is fixed, DNS still points at the old site:

| Record | Points at | What it is |
| --- | --- | --- |
| `A systemhelp.co.uk` | `3.33.251.168`, `15.197.225.128` | the old provider's website |
| `CNAME www` | `d2zh1mbb6w7igb.cloudfront.net` | the old systeme.io site |

The new site is served only by the Worker at `systemhelp.riley-2e2.workers.dev`. Nothing points
`systemhelp.co.uk` at it yet. So there are two separate jobs here, and fixing one without the other
still leaves the old site on screen.

## Fix 1 — clear the stale DNSSEC keys (do this first)

You have a choice. Both work.

**Option A, keep DNSSEC (recommended):**

1. Cloudflare dashboard → select the `systemhelp.co.uk` zone → **DNS → Settings → DNSSEC** → Enable.
   Cloudflare will show you a DS record (key tag, algorithm 13, digest type 2, and a long digest).
2. Go to **GoDaddy → your domain → DNSSEC**. Delete the **two** existing DS records
   (tags **33789** and **51860**), then add Cloudflare's DS record.
3. That is it. The DS TTL at the registry is 10 seconds, so this takes effect quickly.

**Option B, simplest and fastest:**

1. Same place — **GoDaddy → your domain → DNSSEC** — and just **delete both DS records**.
2. Resolution resumes immediately for everyone, unsigned. You can come back and do Option A
   properly later without any downtime.

If GoDaddy's panel shows no DNSSEC records at all, the DS records were added through the previous
DNS provider, and you will need GoDaddy support to clear them — quote the two key tags above.

## Fix 2 — point the website at the Worker

In the Cloudflare dashboard:

1. **Workers & Pages → systemhelp → Settings → Domains & Routes → Add → Custom domain**
2. Add **`systemhelp.co.uk`**, then add **`www.systemhelp.co.uk`**. Cloudflare creates the correct
   DNS records and the certificate for you.
3. Delete the two old `A` records for `systemhelp.co.uk` and the old `www` CNAME pointing at
   `d2zh1mbb6w7igb.cloudfront.net`. Leaving them in place competes with the Worker.

The alternative is the `routes` block already sitting commented-out in `wrangler.jsonc`: uncomment
it and redeploy, and the deploy claims both hostnames. Either route reaches the same end.

Also worth doing: in **SSL/TLS → Overview**, set the encryption mode to **Full (strict)**. It
defaults to Flexible on some imports, and Flexible with an origin that has no valid certificate is
how redirect loops start.

## What NOT to touch

These are live and working. They have nothing to do with the website:

- `MX` → `mx1/mx2/mx3-usg2.ppe-hosted.com` (Proofpoint)
- `TXT` → the SPF record and `MS=ms51839629` (Microsoft 365 domain verification)
- `TXT _dmarc`
- `CNAME selector1._domainkey`, `selector2._domainkey` (Microsoft 365 DKIM)
- `CNAME autodiscover`, `lyncdiscover`, `msoid`, `sip` (Microsoft 365)
- `CNAME email` → `email.secureserver.net`
- `SRV _sipfederationtls._tcp`, `SRV _sip._tls`

## One tidy-up while you are in there

Cloudflare's import set several mail and identity records to **Proxied** (orange cloud) —
`autodiscover`, `lyncdiscover`, `msoid`, `sip`. Those hostnames are consumed by Outlook and Teams
over HTTPS, and proxying them hides the real endpoints, which can break autodiscover. Set them to
**DNS only** (grey cloud). It costs nothing and removes a class of intermittent, hard-to-explain
mail-client faults.

Do not proxy anything mail-related. Only the website records should be proxied, and once the Worker
owns them, Cloudflare manages that for you.

## Which hosting option this is: B, Cloudflare Workers

Verified against the live deployment on 2 October 2026, not assumed.

```
live host      systemhelp.riley-2e2.workers.dev     → a Worker (.workers.dev, not .pages.dev)
GET /api/lead  405 {"ok":false,"error":"method_not_allowed"}   → worker/index.js is answering
a static page  200
a missing page 404                                  → the custom 404 from the assets binding

wrangler.jsonc
  name          systemhelp
  main          worker/index.js
  assets        ./site
  run_worker_first  ["/api/*"]
  routes        commented out — the domain is not attached yet
```

So this is **B: Cloudflare Workers with static assets**. The site is published as Worker assets
and `worker/index.js` handles `/api/*`. Nothing is served from an external origin, which rules out
C, and there is no Pages project, which rules out A.

### What that means for each of the four options

| Option | Applies here? | Why |
| --- | --- | --- |
| **A — Pages** | No | There is no Pages project. The repo does carry `functions/api/lead.js`, which would work if you ever migrated to Pages, but the live deployment is a Worker. |
| **B — Workers** | **Yes, this is it** | Attach the domain to the Worker. |
| **C — DNS only, external hosting** | No, and this is the current broken state | The old `A` records pointing at the previous provider *are* option C, and they are exactly why the old site appears. There is no external origin to point at. |
| **D — Redirects / Worker routes** | Only for a tidy-up | Not for attaching the site. Use a Redirect Rule for `www` → apex; that is all it is needed for. |

### The order that avoids conflicts

1. **Clear the DS records** (Fix 1). Independent of all four options — every one of them sits
   behind the same DNS, so the SERVFAIL persists until the stale keys are gone.
2. **Delete the old records**: both `A` records on the apex and the `www` CNAME to CloudFront.
   Do this *before* adding the custom domain, so nothing conflicts when Cloudflare creates its own
   records.
3. **Add the custom domains** to the Worker (`systemhelp.co.uk`, then `www.systemhelp.co.uk`).
4. **Optional, recommended**: a Redirect Rule sending `www.systemhelp.co.uk` → `301` to
   `https://systemhelp.co.uk`. Every page's canonical tag and the sitemap already declare the apex,
   so this only removes duplicate content; it changes nothing for visitors who land on the apex.

The config-as-code alternative to step 3 is the `routes` block already written and commented out in
`wrangler.jsonc` — uncomment it and redeploy. The zone is now in your account, so it will no longer
fail the way the comment warns about. The dashboard route needs no deploy at all.

## How to tell it worked

After Fix 1, this should return an answer rather than `SERVFAIL`:

```sh
dig systemhelp.co.uk @8.8.8.8
```

After Fix 2, this should return the new site:

```sh
curl -sI https://systemhelp.co.uk | head -1
```

---

# Update, 2 October 12:51 — everything is done except one record

Re-checked live after the Worker custom domains were attached. Marked against the two fixes above.

| Job | State |
| --- | --- |
| Custom domains on the Worker | **Done** — `systemhelp.co.uk` and `www.systemhelp.co.uk`, both Production |
| Old `A` records deleted | **Done** — the apex no longer resolves to `3.33.251.168` / `15.197.225.128` |
| Old `www` CNAME deleted | **Done** — no longer points at `d2zh1mbb6w7igb.cloudfront.net` |
| Cloudflare serving the site | **Done** — apex and `www` both answer `172.67.186.191`, `104.21.36.61` |
| Mail and identity records | **Untouched and correct** — now all `cf-proxied:false` (DNS only) |
| **DS records at the registry** | **NOT DONE — this is the only thing still broken** |

## The DS records are still the old provider's

The zone **is** signed by Cloudflare. It publishes two keys:

```
flags=256  algorithm=13  key tag 29253   (ZSK)
flags=257  algorithm=13  key tag 33447   (KSK / SEP)   <- the DS must point at this
```

The registry still holds:

```
key tag 33789   algorithm 13   digest type 2     <- not ours
key tag 51860   algorithm 13   digest type 2     <- not ours
```

Neither matches 33447. That is the whole of the remaining fault, and it is why
`dig systemhelp.co.uk` returns `SERVFAIL` while `dig +cd systemhelp.co.uk` returns the correct
Cloudflare addresses. The records are right; the signature chain is not.

**Do this:** Cloudflare → `systemhelp.co.uk` zone → **DNS → Settings → DNSSEC**. It will show you
the DS record it expects you to publish — **key tag 33447, algorithm 13, digest type 2**, plus a
long digest string. Copy that. Then **GoDaddy → your domain → DNSSEC**: delete the two records
tagged 33789 and 51860, and add Cloudflare's. The DS TTL is 10 seconds, so it takes effect almost
at once.

If you would rather not run DNSSEC at all, just delete both DS records and stop there. Resolution
returns just as quickly.

## The edge certificate is not issued yet

Connecting directly to Cloudflare's edge on `172.67.186.191` with SNI `systemhelp.co.uk` currently
fails the handshake — alert 40, no certificate presented. The certificate for the two custom
domains has not been provisioned yet. That is expected this soon after attaching them, and it
should resolve itself once the domain actually resolves. If it has not appeared about 30 minutes
after the DS records are cleared, look at **SSL/TLS → Edge Certificates**.

One note on the SSL mode I mentioned earlier: for a Worker custom domain it is moot. There is no
origin to encrypt to — Cloudflare terminates the connection and runs the Worker. Set it to
**Full (strict)** anyway, so that anything you proxy later is not left on Flexible.

---

# If GoDaddy's DNSSEC panel shows "off"

It does not mean the registry is clear. Read straight from Nominet's registry via RDAP
(`https://rdap.nominet.uk/uk/domain/systemhelp.co.uk`) at 12:55 on 2 October:

```
domain       systemhelp.co.uk
status       client transfer prohibited, client update prohibited, client renew prohibited,
             client delete prohibited
nameservers  arturo.ns.cloudflare.com., surina.ns.cloudflare.com.
registrar    GoDaddy.com, LLC
registered   2000-05-24        last changed 2026-10-01 (the nameserver move)

DS  key tag 33789,  algorithm 13,  digest type 2
DS  key tag 51860,  algorithm 13,  digest type 2
```

Two public resolvers report the same two records. So this is not a display quirk and not a caching
artefact — the stale keys are genuinely in the parent zone.

**Why the panel says off.** GoDaddy's DNSSEC controls only manage those records while the domain
uses GoDaddy's nameservers. The moment you moved to Cloudflare, the panel stopped showing and
managing them. But DS records already published at the registry stay there. They are a
**registrar-level** record — Nominet will not accept a change from the registrant directly, only
from GoDaddy as the registrar of record.

## Three routes, best first

**1. Add, don't remove.** A DS RRset may contain several records, and a validating resolver is
satisfied if **any** of them matches a key in the zone. So you do not have to get the old ones
deleted. If GoDaddy offers *Add DS record* — some accounts show this even with the toggle reading
off — add Cloudflare's:

```
key tag 33447   algorithm 13   digest type 2   digest: (copy from Cloudflare's DNSSEC page)
```

Resolution starts working immediately. The two stale records become harmless leftovers, worth
tidying at renewal.

**2. Ask GoDaddy support.** One message: remove the DS records with key tags **33789** and
**51860** for `systemhelp.co.uk`, and add Cloudflare's **33447**. Registrar of record is
**GoDaddy.com, LLC**. This is a routine registrar task. Quote the key tags and the domain; they can
see both in their own records.

**3. Fallback if support is slow.** Point the nameservers back at GoDaddy's temporarily — the
DNSSEC panel reappears — turn DNSSEC off there, which removes the DS records at the registry, then
move the nameservers back to Cloudflare. It works, but it adds a second outage window, so try 1 and
2 first.

## Which DS record is the right one

The zone is being signed by Cloudflare. Measured directly, it publishes:

```
flags=256  algorithm=13  key tag 29253   (ZSK)
flags=257  algorithm=13  key tag 33447   (KSK / SEP)   <- the DS must reference this one
```

Open Cloudflare → `systemhelp.co.uk` zone → **DNS → Settings → DNSSEC**. The DS record shown there
should read **key tag 33447, algorithm 13, digest type 2**. That is the one to publish. If the panel
instead says DNSSEC is not enabled, enabling it will produce that same record.

The edge certificate is still not issued (SNI `systemhelp.co.uk` against the edge returns a
handshake failure with no certificate). Expect it within a few minutes of the domain resolving —
Cloudflare cannot complete issuance while DNS is failing.
