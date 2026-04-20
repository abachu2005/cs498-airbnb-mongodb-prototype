const { mdToPdf } = require("md-to-pdf");
const path = require("path");
const fs = require("fs");

const a = [
  { src: "STAGE_3_Report_MongoDB_Airbnb.md", dst: "STAGE_3_Report_MongoDB_Airbnb.pdf" },
  { src: "SLIDE_OUTLINE.md", dst: "SLIDE_OUTLINE.pdf" },
];

const b = `
  body { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.4; color: #1e2831; }
  h1 { font-size: 17pt; margin-top: 0.6em; }
  h2 { font-size: 13pt; margin-top: 1.0em; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  h3 { font-size: 11.5pt; margin-top: 0.8em; }
  pre, code { font-family: "Menlo", "Monaco", "Consolas", monospace; font-size: 8.5pt; }
  pre { background: #f6f8fa; padding: 8px; border: 1px solid #e1e4e8; border-radius: 4px; overflow-x: auto; }
  table { border-collapse: collapse; margin: 0.5em 0; }
  th, td { border: 1px solid #d0d7de; padding: 4px 8px; font-size: 9.5pt; }
  th { background: #f6f8fa; }
  a { color: #0969da; text-decoration: none; }
`;

(async () => {
  for (const x of a) {
    const s = path.join(__dirname, "..", x.src);
    if (!fs.existsSync(s)) {
      console.log(`[pdf] skip missing ${x.src}`);
      continue;
    }
    const d = path.join(__dirname, "..", x.dst);
    console.log(`[pdf] ${x.src} -> ${x.dst}`);
    await mdToPdf(
      { path: s },
      {
        dest: d,
        css: b,
        pdf_options: { format: "Letter", margin: { top: "0.65in", bottom: "0.65in", left: "0.72in", right: "0.72in" } },
        launch_options: { args: ["--no-sandbox"] },
      }
    );
  }
  console.log("[pdf] done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
