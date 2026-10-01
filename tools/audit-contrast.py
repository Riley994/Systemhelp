#!/usr/bin/env python3
"""
Text contrast audit for the TEAM IQ site.

Walks every page, finds every element that directly contains text, and measures
its colour against its real background. Translucent layers are composited down
to an opaque colour, so a ghost button on a dark band is measured as what it
actually looks like rather than as its own rgba value.

Thresholds are WCAG AA: 4.5:1 for body text, 3.0:1 for large text (24px, or
18.66px bold). Elements whose background comes from an image are reported
separately, because the colour underneath cannot be computed.

Usage
-----
Start the preview server, then:

    python3 tools/audit-contrast.py            # every page
    python3 tools/audit-contrast.py /book/     # one page

Requires playwright and a chromium binary:

    pip3 install playwright
    python3 -m playwright install chromium

Exits non-zero if anything fails, so it can gate a release.
"""
import asyncio, glob, os, sys
from playwright.async_api import async_playwright

JS = """
() => {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map(v => { v = v/255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  };
  const analyse = (el) => {
    const stack = [];
    let n = el, img = false;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') img = true;
      const m = cs.backgroundColor.match(/[\\d.]+/g);
      if (m) {
        const a = m.length < 4 ? 1 : parseFloat(m[3]);
        if (a > 0) { stack.push([+m[0], +m[1], +m[2], a]); if (a === 1) break; }
      }
      n = n.parentElement;
    }
    let bg = [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) {
      const [r, g, b, a] = stack[i];
      bg = [a*r + (1-a)*bg[0], a*g + (1-a)*bg[1], a*b + (1-a)*bg[2]];
    }
    const cs = getComputedStyle(el);
    const c = cs.color.match(/[\\d.]+/g).slice(0,3).map(Number);
    const l1 = lum(c), l2 = lum(bg);
    const ratio = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 600;
    const large = size >= 24 || (size >= 18.66 && bold);
    return { ratio: +ratio.toFixed(2), colour: 'rgb(' + c.join(',') + ')',
             bg: 'rgb(' + bg.map(v => Math.round(v)).join(',') + ')',
             large, img, size: Math.round(size) };
  };
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)) return;
    const t = (el.textContent || '').trim();
    if (!t || t.length > 120) return;
    if (el.offsetParent === null) return;
    const r = analyse(el);
    const need = r.large ? 3.0 : 4.5;
    if (r.ratio < need) {
      out.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 30),
                 t: t.slice(0, 44), ...r, need });
    }
  });
  return out;
}
"""

async def main():
    if len(sys.argv) > 1:
        urls = sys.argv[1:]
    else:
        pages = sorted(glob.glob("site/**/index.html", recursive=True))
        urls = []
        for p in pages:
            rel = p[len("site"):-len("index.html")]
            urls.append(rel if rel else "/")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 1440, "height": 950})
        total = 0
        imgbg = []
        seen = {}
        for u in urls:
            await pg.goto("http://127.0.0.1:3000" + u, wait_until="load")
            await pg.wait_for_timeout(450)
            rows = await pg.evaluate(JS)
            for r in rows:
                if r["img"]:
                    imgbg.append((u, r)); continue
                total += 1
                key = (r["tag"], r["cls"], r["colour"], r["bg"], r["need"])
                seen.setdefault(key, {"n": 0, "min": 99, "ex": r["t"], "pages": set()})
                seen[key]["n"] += 1
                seen[key]["min"] = min(seen[key]["min"], r["ratio"])
                seen[key]["pages"].add(u)
        print(f"total failing instances: {total}  distinct kinds: {len(seen)}")
        print("\n=== grouped, worst first ===")
        for key, v in sorted(seen.items(), key=lambda kv: kv[1]["min"]):
            tag, cls, colour, bg, need = key
            pages = ", ".join(sorted(v["pages"]))[:46]
            print(f"  {v['min']:5.2f} (need {need})  x{v['n']:<3} {tag:6s} .{cls:26s} {colour} on {bg}")
            print(f"          eg {v['ex']!r:44s} {pages}")
        if imgbg:
            print(f"skipped (text over a background image, needs eyes): {len(imgbg)}")
            for u, r in imgbg[:12]:
                print(f"    {u:26s} {r['tag']:5s} .{r['cls']:22s} {r['t'][:34]!r:36s} {r['colour']} ratio {r['ratio']}")
        await b.close()
        sys.exit(1 if total else 0)

asyncio.run(main())
