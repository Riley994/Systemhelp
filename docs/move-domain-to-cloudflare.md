# Moving systemhelp.co.uk to Cloudflare

Written 1 October 2026, from a live inspection of the domain's DNS. Everything
in the tables below was read from the public DNS at that time, not assumed.

---

## 1. The situation as it actually is

Two things in the brief turned out to be different from how they were described,
and both change what you have to do.

**The DNS is not managed by Systeme.io. It is managed by GoDaddy.**

```
systemhelp.co.uk  NS  ns31.domaincontrol.com
                      ns32.domaincontrol.com
```

`domaincontrol.com` is GoDaddy's nameserver pair. Systeme.io never held the
zone — the domain was *pointed* at Systeme.io using records inside GoDaddy's
DNS panel. That is good news: the nameserver change happens in the GoDaddy
account you already use, and nothing needs to be done inside Systeme.io except
stop using it.

**This domain carries live email, and it is not simple email.**

| What | Where it points | Why it matters |
| --- | --- | --- |
| MX × 3 | `mx1-usg2.ppe-hosted.com` etc. | Proofpoint Essentials filters your mail |
| SPF TXT | `v=spf1 include:_spf-usg2.ppe-hosted.com include:secureserver.net ~all` | Without it, your mail is treated as spam |
| `MS=ms51839629` TXT | Microsoft 365 domain verification | Microsoft may un-verify the domain |
| DKIM CNAME × 2 | `selector1/selector2._domainkey` → `…systemhelp.onmicrosoft.com` | Signs your outbound mail |
| DMARC TXT | `v=DMARC1; p=none` | Your DMARC policy |
| `autodiscover`, `msoid`, `sip`, `lyncdiscover` CNAMEs | Microsoft 365 / Teams | Outlook and Teams sign-in |
| `_sipfederationtls._tcp`, `_sip._tls` SRV × 2 | Microsoft Teams federation | Teams external calls |

Mail flows: sender → Proofpoint → Microsoft 365. **If any of those records is
missing from Cloudflare when the nameservers change, email breaks** — inbound,
outbound, or both. This is the whole risk of the migration. The website is
easy; the email is what needs care.

**What is being replaced** (these are Systeme.io's, and they go):

| Record | Current value |
| --- | --- |
| `systemhelp.co.uk` A | `3.33.251.168`, `15.197.225.128` |
| `www` CNAME | `d2zh1mbb6w7igb.cloudfront.net` |
| `email` CNAME | `email.secureserver.net` (GoDaddy autoconfig, harmless) |

Today `systemhelp.co.uk` answers with a 301 to `www.systemhelp.co.uk`, which is
served by Systeme.io's nginx. The new site is already live and healthy at
`https://systemhelp.riley-2e2.workers.dev/`.

---

## 2. Before you start

1. **Export the zone from GoDaddy.** In GoDaddy: *My Products → Domains →
   systemhelp.co.uk → DNS → Export zone file*. Keep it. It is your complete
   record list and your rollback.
2. **Use the Cloudflare account at `Riley@rp-racing.co.uk`** — the one that
   already holds the `riley-2e2` Worker.
3. **Pick a quiet hour.** During propagation some visitors get the old site and
   some the new one. It is not an outage, but it is untidy.
4. **Do not enable Cloudflare Email Routing.** It offers to "take over your
   email" and will add competing MX records. Your mail is on Microsoft 365 via
   Proofpoint. Decline it if prompted.
5. **Do not turn on DNSSEC** until the zone is active, and only then by adding
   the DS record at GoDaddy. There is no DS record today.

---

## 3. Step 1 — create the zone and import the records

1. Cloudflare dashboard → **Add a site** → `systemhelp.co.uk` → **Free** plan.
2. Cloudflare scans the existing DNS and shows what it found. **Do not trust the
   scan.** Compare it against the table below and add anything missing.
3. Cloudflare assigns you two nameservers (something like
   `dana.ns.cloudflare.com` and `rob.ns.cloudflare.com`). Write them down; you
   need them in step 3.

### The records the zone must contain

Copy these in exactly. Set every one to **DNS only** (grey cloud) — they are not
web traffic, and the proxy setting does not apply to them.

| Type | Name | Value | Priority |
| --- | --- | --- | --- |
| MX | `@` | `mx1-usg2.ppe-hosted.com` | 0 |
| MX | `@` | `mx2-usg2.ppe-hosted.com` | 0 |
| MX | `@` | `mx3-usg2.ppe-hosted.com` | 0 |
| TXT | `@` | `v=spf1 include:_spf-usg2.ppe-hosted.com include:secureserver.net ~all` | — |
| TXT | `@` | `MS=ms51839629` | — |
| TXT | `_dmarc` | `v=DMARC1; p=none` | — |
| CNAME | `selector1._domainkey` | `selector1-systemhelp-co-uk._domainkey.systemhelp.onmicrosoft.com` | — |
| CNAME | `selector2._domainkey` | `selector2-systemhelp-co-uk._domainkey.systemhelp.onmicrosoft.com` | — |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | — |
| CNAME | `msoid` | `clientconfig.microsoftonline-p.net` | — |
| CNAME | `sip` | `sipdir.online.lync.com` | — |
| CNAME | `lyncdiscover` | `webdir.online.lync.com` | — |
| SRV | `_sipfederationtls._tcp` | `100 1 5061 sipfed.online.lync.com` | — |
| SRV | `_sip._tls` | `100 1 443 sipdir.online.lync.com` | — |

The two SRV records are the ones Cloudflare's scan most often misses. Check for
them by name rather than by eye.

### What Cloudflare's import gets wrong

The scan brings in the right values but the wrong proxy status on seven records.
It cannot tell web traffic from service records, and it assumes anything with a
hostname is web traffic.

**Delete these three.** They are Systeme.io's, and while they exist the Worker
cannot claim the hostname — adding a custom domain fails with "a record with
that host already exists".

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `15.197.225.128` |
| A | `@` | `3.33.251.168` |
| CNAME | `www` | `d2zh1mbb6w7igb.cloudfront.net` |

**Switch these four to DNS only.** The scan proxies them because they are
CNAMEs, but none of them is a website. Proxied, Cloudflare answers with its own
addresses, so Outlook and Teams resolve to the wrong place.

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `autodiscover` | `autodiscover.outlook.com` |
| CNAME | `msoid` | `clientconfig.microsoftonline-p.net` |
| CNAME | `sip` | `sipdir.online.lync.com` |
| CNAME | `lyncdiscover` | `webdir.online.lync.com` |

The DKIM, MX, TXT, SRV and `email` records are correctly DNS only as imported.
Do not proxy any of them.

**Do not** recreate the Systeme.io A and www CNAME records. Step 2 creates the
correct ones.

---

## 4. Step 2 — point the domain at the Worker

Do this **before** the nameserver change. It is harmless while the zone is
inactive, and it means there is no window where the domain resolves to nothing.

Cloudflare dashboard → **Workers & Pages** → `systemhelp` → **Settings** →
**Domains & Routes** → **Add** → **Custom domain**:

1. Add `systemhelp.co.uk`
2. Add `www.systemhelp.co.uk`

Cloudflare creates the DNS records and the TLS certificate itself. Do not add
manual A records for these names — the custom domain is what makes the Worker
answer for them.

### The alternative, if you prefer it in code

`wrangler.jsonc` has a commented-out `routes` block. Uncomment it and the next
`npx wrangler deploy` creates both custom domains for you:

```jsonc
"routes": [
  { "pattern": "systemhelp.co.uk",     "custom_domain": true },
  { "pattern": "www.systemhelp.co.uk", "custom_domain": true }
]
```

Leave it commented until the zone exists in the Cloudflare account. Until then
a deploy would fail, which would break your Git-integration build.

---

## 5. Step 3 — change the nameservers at GoDaddy

This is the cutover, and the only step that cannot be undone in a minute.

1. GoDaddy → **My Products** → **Domains** → `systemhelp.co.uk` → **DNS**.
2. Find **Nameservers** → **Change** → choose **I'll use my own nameservers**.
3. Enter the two Cloudflare nameservers from step 1. Remove the two
   `domaincontrol.com` entries.
4. Save. GoDaddy may ask you to confirm by email.

Cloudflare emails you when the zone is **Active**. That is usually minutes,
occasionally a few hours. Until then, keep the GoDaddy records exactly as they
are — they are still what the world is reading.

---

## 6. Step 4 — verify, in this order

**The website**

```bash
curl -sI https://systemhelp.co.uk/      | head -1   # expect HTTP/2 200
curl -sI https://www.systemhelp.co.uk/  | head -1
```

Both should serve the new site with a valid certificate. Cloudflare issues the
certificate automatically; if you see a TLS warning, wait ten minutes and retry
before investigating.

**The email — do this before you relax**

```bash
# MX still points at Proofpoint
dig +short MX systemhelp.co.uk

# SPF, Microsoft verification and DMARC are still present
dig +short TXT systemhelp.co.uk
dig +short TXT _dmarc.systemhelp.co.uk

# DKIM selectors still resolve
dig +short CNAME selector1._domainkey.systemhelp.co.uk
dig +short CNAME selector2._domainkey.systemhelp.co.uk

# Teams federation records
dig +short SRV _sipfederationtls._tcp.systemhelp.co.uk
```

Then, for real: send an email to `andrew@systemhelp.co.uk` from an outside
account and reply to it. Check the reply arrives and does not land in spam —
that is the test that proves DKIM and SPF survived.

---

## 7. Decisions to make at the same time

**www or no www.** The old site made `www` canonical and redirected the apex to
it. The new site's canonical tags all say `https://systemhelp.co.uk/` — the
apex. Those now disagree. The clean fix is apex canonical, `www` redirecting to
the apex, which is what the site's own metadata already assumes. The Worker can
do that redirect in three lines; say the word and I will add it.

**Systeme.io.** Once the zone is live, Systeme.io no longer serves the website.
Keep the account if you use it for email campaigns or forms, but remove the
domain from its website settings so it does not try to reclaim it.

**Old URLs.** `site/_redirects` already maps the old systemhelp.co.uk paths onto
the new ones, so the search equity built up by the old site is preserved. Check
it once the domain is live by requesting one of the old URLs and confirming it
lands on the right new page.

---

## 8. If it goes wrong

The rollback is quick, because nothing at GoDaddy is deleted.

1. GoDaddy → DNS → Nameservers → restore `ns31.domaincontrol.com` and
   `ns32.domaincontrol.com`.
2. Propagation back is the same order of time as it was going out.

Do not delete the GoDaddy zone file, and do not delete the records in the
GoDaddy panel. They become inert the moment the nameservers change, and they are
what makes this reversible.

---

## 9. Summary of the whole job

1. Export the GoDaddy zone file. Keep it.
2. Add the site to Cloudflare. Verify every record in section 3 is present,
   especially the two SRV records.
3. Add both custom domains to the `systemhelp` Worker.
4. Change the nameservers at GoDaddy to Cloudflare's pair.
5. Confirm the site loads, then confirm email still works — send and receive.
