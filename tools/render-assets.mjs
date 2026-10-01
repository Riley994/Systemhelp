#!/usr/bin/env node
/* ==========================================================================
   tools/render-assets.mjs — DEVELOPMENT ONLY
   --------------------------------------------------------------------------
   Turns the HTML templates in tools/templates/ into the finished assets the
   website serves: the social share image, the app icon, and the printable
   PDFs (business case, sample diagnostic report).

   Why it works this way: the templates are ordinary HTML, so the typography
   is pixel-perfect and the client can edit the words in a text editor and
   re-run this script. Nothing here is needed to RUN the website — the site
   is plain static files. This only regenerates the downloads.

   Usage:   node tools/render-assets.mjs
   Needs:   chromium on the PATH (already installed on the Sandbox)
   ========================================================================== */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, access } from "node:fs/promises";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const TEMPLATES = join(HERE, "templates");
const IMG = join(ROOT, "site/assets/img");
const DL = join(ROOT, "site/assets/downloads");

const CHROME_CANDIDATES = ["chromium", "chromium-browser", "google-chrome", "/usr/bin/chromium", "/usr/bin/google-chrome"];

async function findChrome() {
  for (const bin of CHROME_CANDIDATES) {
    try {
      if (bin.startsWith("/")) { await access(bin); return bin; }
      await run("which", [bin]);
      return bin;
    } catch { /* try next */ }
  }
  throw new Error("No chromium binary found. Install chromium, or run this on a machine that has it.");
}

const fileUrl = (p) => "file://" + p;

async function screenshot(chrome, template, out, width, height) {
  await run(chrome, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--disable-lcd-text",
    "--virtual-time-budget=2500",
    `--window-size=${width},${height}`,
    `--screenshot=${out}`,
    fileUrl(join(TEMPLATES, template))
  ], { maxBuffer: 32 * 1024 * 1024 });
  console.log(`  ✓ ${out.replace(ROOT + "/", "")}  ${width}×${height}`);
}

async function pdf(chrome, template, out) {
  await run(chrome, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--virtual-time-budget=3000",
    `--print-to-pdf=${out}`,
    fileUrl(join(TEMPLATES, template))
  ], { maxBuffer: 32 * 1024 * 1024 });
  console.log(`  ✓ ${out.replace(ROOT + "/", "")}  (PDF)`);
}

async function main() {
  const chrome = await findChrome();
  await mkdir(IMG, { recursive: true });
  await mkdir(DL, { recursive: true });
  console.log(`Rendering assets with ${chrome}`);

  const only = process.argv[2];

  if (!only || only === "images") {
    console.log("\nSocial + icons:");
    await screenshot(chrome, "og-default.html", join(IMG, "og-team-iq.png"), 1200, 630);
    await screenshot(chrome, "icon-app.html", join(ROOT, "site/apple-touch-icon.png"), 180, 180);
    await screenshot(chrome, "icon-app.html", join(ROOT, "site/assets/img/icon-512.png"), 512, 512);
  }

  if (!only || only === "pdf") {
    console.log("\nDownloads:");
    await pdf(chrome, "business-case.html", join(DL, "team-iq-business-case.pdf"));
    await pdf(chrome, "sample-diagnostic.html", join(DL, "team-iq-sample-diagnostic.pdf"));
    await pdf(chrome, "benchmark-report.html", join(DL, "team-iq-benchmark-report.pdf"));
    await pdf(chrome, "workshop-notes.html", join(DL, "team-iq-workshop-notes.pdf"));
  }

  console.log("\nDone. Commit the changed files in site/assets/.");
}

main().catch((err) => {
  console.error("render-assets failed:", err.message);
  process.exit(1);
});