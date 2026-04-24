// captures screenshots of the demo UI for the slide deck.
// expects the web server (npm run web / web:fast) to already be running on PORT
// (default 4173). each query panel is opened, populated, then snapped at 1.5x
// device pixel ratio so it stays sharp when the slide PDF renders at 1920x1080.

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

const DEFAULT_PORT = 4173;
const OUT = path.join(__dirname, "..", "slides", "assets");

fs.mkdirSync(OUT, { recursive: true });

// chrome we already have via puppeteer's md-to-pdf install
const CHROME = process.env.CHROME_PATH || `${process.env.HOME}/.cache/puppeteer/chrome/mac_arm-147.0.7727.57/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

async function shoot(page, sel, name, opts = {}) {
  const el = await page.$(sel);
  if (!el) throw new Error(`element not found: ${sel}`);
  // small delay so any post-render layout (charts) can settle
  await new Promise((r) => setTimeout(r, 250));
  const file = path.join(OUT, `${name}.png`);
  await el.screenshot({ path: file, omitBackground: false, ...opts });
  const sz = fs.statSync(file).size;
  console.log(`[capture] ${name}.png  (${(sz / 1024).toFixed(1)} KB)`);
}

async function fullshot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const sz = fs.statSync(file).size;
  console.log(`[capture] ${name}.png  (${(sz / 1024).toFixed(1)} KB)`);
}

async function clickTab(page, tab) {
  await page.evaluate((t) => {
    const b = document.querySelector(`button.tab[data-tab="${t}"]`);
    if (b) b.click();
  }, tab);
  // wait for the right panel to flip to is-active
  await page.waitForFunction(
    (t) => document.querySelector(`#panel-${t}.is-active`) != null,
    { timeout: 5000 },
    tab
  );
}

async function waitForResults(page, tab, timeout = 30000) {
  // wait for the .loading div to be gone AND results to contain actual content
  // (every runQ first paints `<div class="loading">...</div>` then renderQ swaps it out)
  await page.waitForFunction(
    (t) => {
      const r = document.querySelector(`#panel-${t} .results`);
      if (!r) return false;
      if (r.querySelector(".loading")) return false;
      return r.innerText.trim().length > 20;
    },
    { timeout, polling: 250 },
    tab
  );
  // give charts/badges a beat to lay out
  await new Promise((r) => setTimeout(r, 1000));
}

// per-tab timeouts -- on the FULL InsideAirbnb dataset, Q5 (3.2M-row collection scan)
// and Q6 (multi-collection enrichment) need a longer ceiling than the default 30s.
async function runCapture({ port = DEFAULT_PORT, full = false } = {}) {
  const base = `http://localhost:${port}/`;
  const tQ1 = full ? 180000 : 30000;
  const tQ2 = full ? 180000 : 30000;
  const tQ3 = full ? 360000 : 60000;
  const tQ4 = full ? 1500000 : 60000;
  const tQ5 = full ? 360000 : 60000;
  const tQ6 = full ? 900000 : 60000;

  console.log(`[capture] launching headless chrome -> ${base} (full=${full})`);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ["--no-sandbox"],
    defaultViewport: { width: 1600, height: 1100, deviceScaleFactor: 1.5 },
  });

  try {
    const page = await browser.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") console.log(`[browser-err] ${m.text()}`);
    });

    await page.goto(base, { waitUntil: "domcontentloaded" });

    // boot overlay screenshot first (UI is paused on it)
    // since the server is already ready, the poll completes
    // almost instantly; the boot card disappears in <1s. so to capture it, we briefly
    // throttle the network so /api/health is delayed.
    {
      const p2 = await browser.newPage();
      await p2.setViewport({ width: 1600, height: 1100, deviceScaleFactor: 1.5 });
      const c = await p2.target().createCDPSession();
      await c.send("Network.enable");
      await c.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 4000,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await p2.goto(base, { waitUntil: "domcontentloaded" });
      await p2.waitForSelector(".boot-card", { timeout: 5000 });
      await new Promise((r) => setTimeout(r, 600));
      const f = path.join(OUT, "demo_boot.png");
      await p2.screenshot({ path: f });
      console.log(`[capture] demo_boot.png`);
      await p2.close();
    }

    // wait for normal page to be ready
    await page.waitForFunction(() => document.querySelector("#boot.is-hidden") != null, { timeout: 60000 });
    console.log("[capture] boot done, capturing top of page");

    // hero shot: topbar + tabs + a sliver of the active panel header
    await fullshot(page, "demo_hero");

    // also a tighter shot of just the topbar + tabs
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 200));
    await page.evaluate(() => {
      const t = document.querySelector(".topbar");
      const n = document.querySelector(".tabs");
      const w = document.createElement("div");
      w.id = "x-cap";
      w.style.cssText = "position:fixed;left:0;top:0;width:100vw;background:#fafaf7;z-index:99999;";
      w.appendChild(t.cloneNode(true));
      w.appendChild(n.cloneNode(true));
      document.body.appendChild(w);
    });
    await new Promise((r) => setTimeout(r, 200));
    await shoot(page, "#x-cap", "demo_chrome");
    await page.evaluate(() => {
      const x = document.getElementById("x-cap");
      if (x) x.remove();
    });

    // q1 is the default panel; auto-runs on ready -> wait for results then snap
    await waitForResults(page, "q1", tQ1);
    await shoot(page, "#panel-q1", "demo_q1");

    // q2: click tab, runQ2 fires automatically on tab activation (per app.js wiring)
    await clickTab(page, "q2");
    await waitForResults(page, "q2", tQ2);
    await shoot(page, "#panel-q2", "demo_q2");

    // q3
    await clickTab(page, "q3");
    await waitForResults(page, "q3", tQ3);
    await shoot(page, "#panel-q3", "demo_q3");

    // q4 -- runs on first tab activation per app.js
    await clickTab(page, "q4");
    await waitForResults(page, "q4", tQ4);
    await shoot(page, "#panel-q4", "demo_q4");

    // q5 -- tab activation auto-runs the aggregation
    await clickTab(page, "q5");
    await waitForResults(page, "q5", tQ5);
    await shoot(page, "#panel-q5", "demo_q5");

    // q6 -- same; tab activation kicks off runQ6
    await clickTab(page, "q6");
    await waitForResults(page, "q6", tQ6);
    await shoot(page, "#panel-q6", "demo_q6");

    console.log(`[capture] done -> ${OUT}`);
  } finally {
    await browser.close();
  }
}

module.exports = { runCapture };

if (require.main === module) {
  const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;
  const full = process.env.FULL === "1";
  runCapture({ port, full }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
