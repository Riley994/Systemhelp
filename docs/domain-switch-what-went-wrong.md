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

## How to tell it worked

After Fix 1, this should return an answer rather than `SERVFAIL`:

```sh
dig systemhelp.co.uk @8.8.8.8
```

After Fix 2, this should return the new site:

```sh
curl -sI https://systemhelp.co.uk | head -1
```