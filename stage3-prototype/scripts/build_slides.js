// renders slides/slides.html into STAGE_3_SLIDES.pdf via puppeteer.
// for each .slide section we screenshot the element at exactly 1920x1080 (2x dpr
// for retina sharpness), then assemble all PNGs into a single PDF using pdf-lib.
// each PDF page is sized to match the screenshot at 96dpi -> 20" x 11.25" landscape.
//
// flow:
//   slides.html  ->  puppeteer screenshots one PNG per .slide  ->  pdf-lib stitches into PDF

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");

const ROOT = path.join(__dirname, "..");
const SLIDE_HTML = path.join(ROOT, "slides", "slides.html");
const PNG_DIR = path.join(ROOT, "slides", "rendered");
const OUT_PDF = path.join(ROOT, "STAGE_3_SLIDES.pdf");

const W = 1920;
const H = 1080;
const DPR = 2;

const CHROME = process.env.CHROME_PATH || `${process.env.HOME}/.cache/puppeteer/chrome/mac_arm-147.0.7727.57/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

fs.mkdirSync(PNG_DIR, { recursive: true });

(async () => {
  console.log("[build] launching headless chrome");
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ["--no-sandbox"],
    defaultViewport: { width: W, height: H, deviceScaleFactor: DPR },
  });

  try {
    const page = await browser.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") console.log(`[browser-err] ${m.text()}`);
    });
    page.on("pageerror", (e) => console.log(`[page-err] ${e.message}`));

    const url = "file://" + SLIDE_HTML;
    console.log(`[build] loading ${url}`);
    await page.goto(url, { waitUntil: "networkidle0" });

    // ensure web fonts have actually rendered before we screenshot
    await page.evaluate(() => document.fonts.ready);
    // tiny extra beat for any post-font layout shift
    await new Promise((r) => setTimeout(r, 400));

    const count = await page.$$eval("section.slide", (els) => els.length);
    console.log(`[build] found ${count} slides`);

    const pngFiles = [];
    for (let i = 0; i < count; i++) {
      const sel = `section.slide:nth-of-type(${i + 1})`;
      const el = await page.$(sel);
      if (!el) throw new Error(`missing ${sel}`);
      const png = path.join(PNG_DIR, `slide_${String(i + 1).padStart(2, "0")}.png`);
      await el.screenshot({ path: png });
      const sz = fs.statSync(png).size;
      console.log(`[build] slide ${i + 1}/${count}  ->  ${path.basename(png)}  (${(sz / 1024).toFixed(0)} KB)`);
      pngFiles.push(png);
    }

    console.log(`[build] assembling pdf -> ${path.basename(OUT_PDF)}`);
    const pdf = await PDFDocument.create();
    pdf.setTitle("CS 498 Stage 3 — MongoDB × AirBnB Prototype");
    pdf.setAuthor("Abhinav Bachu, Hanshul Bahl, Alejandra Arias");
    pdf.setSubject("Stage 3 prototype presentation");
    pdf.setCreator("scripts/build_slides.js");

    // size each pdf page to match the slide's pixel dims at 96dpi (1920px = 20")
    const pageW = (W / 96) * 72; // = 1440 pt
    const pageH = (H / 96) * 72; // = 810  pt

    for (const f of pngFiles) {
      const bytes = fs.readFileSync(f);
      const img = await pdf.embedPng(bytes);
      const page = pdf.addPage([pageW, pageH]);
      page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
    }

    const out = await pdf.save();
    fs.writeFileSync(OUT_PDF, out);
    const finalSz = fs.statSync(OUT_PDF).size;
    console.log(`[build] done. ${count} pages, ${(finalSz / 1024 / 1024).toFixed(2)} MB`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
