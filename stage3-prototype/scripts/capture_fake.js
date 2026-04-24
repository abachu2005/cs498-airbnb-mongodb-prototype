// "fake-data" capture path: spins up a tiny express stub that serves the existing
// web/public UI but answers /api/* with canned responses built from the full-data
// CLI evidence already stored in out/q*_results.json. produces the same demo
// screenshots as capture_full.js but boots in <1s instead of waiting ~6.5 min for
// a full mongo load. used to fill in slide screenshots when full-data screenshots
// are too expensive to re-capture mid-iteration.

const path = require("path");
const fs = require("fs");
const express = require("express");

const { runCapture } = require("./capture_demo");

const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;
const ROOT = path.join(__dirname, "..");
const PUB = path.join(ROOT, "web", "public");
const OUT = path.join(ROOT, "out");

function loadJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(OUT, name), "utf-8"));
}

// canned full-data responses sourced from the CLI evidence pipeline
const Q1_RES = loadJSON("q1_results.json");
const Q2_RES = loadJSON("q2_results.json");
const Q3_RES = loadJSON("q3_results.json");
const Q4_RES = loadJSON("q4_results.json");
const Q5_RES = loadJSON("q5_results.json");
const Q6_RES = loadJSON("q6_results.json");
const SUMMARY = loadJSON("summary.json");

// /api/health: expose the same shape the real server publishes once boot completes
const HEALTH = {
  ready: true,
  uptime_ms: 1234,
  counts: SUMMARY.counts,
  q1_default_dates: SUMMARY.q1.dates,
  q2_default_month: SUMMARY.q2.month,
  q3_default_month: SUMMARY.q3.city ? "2026-06" : null,
  q4_year: SUMMARY.q4.year,
};

const app = express();

// boot-card needs at least one not-ready response so the overlay actually renders
// before we screenshot it. flip the gate after ~1s so the rest of the demo runs
// against the ready state.
let bootStartedAt = Date.now();
app.get("/api/health", (req, res) => {
  const elapsed = Date.now() - bootStartedAt;
  if (elapsed < 1000) {
    return res.json({ ready: false, uptime_ms: elapsed });
  }
  res.json(HEALTH);
});

app.get("/api/q1", (req, res) => {
  res.json({
    city: req.query.city || "portland",
    dates: SUMMARY.q1.dates,
    results: Q1_RES,
  });
});
app.get("/api/q2", (_req, res) => res.json(Q2_RES));
app.get("/api/q3", (req, res) => {
  res.json({
    city: req.query.city || "salem",
    month: req.query.month || "2026-06",
    room_type: req.query.room_type || "Entire home/apt",
    results: Q3_RES,
  });
});
app.get("/api/q4", (_req, res) => res.json(Q4_RES));
app.get("/api/q5", (_req, res) => res.json({ results: Q5_RES }));
app.get("/api/q6", (_req, res) => res.json({ results: Q6_RES }));

app.use(express.static(PUB));

(async () => {
  const server = app.listen(PORT, async () => {
    console.log(`[fake] stub up on http://localhost:${PORT} (full-data canned responses)`);
    bootStartedAt = Date.now();
    try {
      // small delay so the ready-flip aligns with the boot screenshot interval
      await new Promise((r) => setTimeout(r, 200));
      await runCapture({ port: PORT, full: false });
      console.log("[fake] capture complete");
    } catch (e) {
      console.error("[fake] capture failed:", e && e.message ? e.message : e);
      server.close();
      process.exit(1);
    }
    server.close(() => process.exit(0));
  });
})();
