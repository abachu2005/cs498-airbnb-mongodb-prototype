// web server: same in-process mongo + same loader as the CLI driver, but exposes the queries
// as HTTP endpoints behind a static frontend in web/public/
// boot is async -- /api/health gates the frontend until S.ready flips true
const path = require("path");
const express = require("express");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");

const A = require("../src/loader");
const B = require("../src/q1");
const C = require("../src/q5");
const D = require("../src/q6");
const G = require("../src/q2");
const H = require("../src/q3");
const I = require("../src/q4");

const P = process.env.PORT ? Number(process.env.PORT) : 4173;

// shared boot state, the frontend polls /api/health and watches S.ready
const S = {
  ready: false,
  err: null,
  counts: null,
  dates: null,
  startedAt: Date.now(),
};

// module-level singletons for the mongo handles -- re-using them across requests
// (creating a new MongoClient per request would re-handshake on every API call)
let G_DB = null;
let G_CLIENT = null;
let G_MEM = null;

// add n days to YYYY-MM-DD (UTC math, see driver for the same helper)
function ds(s, n) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().substring(0, 10);
}

// q1 default-date helper, same logic as the driver -- finds two consecutive available dates
async function pickDates(db, c) {
  const a = await db
    .collection("calendar")
    .aggregate([
      { $match: { city: c, available: true } },
      { $group: { _id: "$date", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  for (let i = 0; i < a.length; i++) {
    const s = a[i]._id;
    const e = ds(s, 1);
    if (a.find((x) => x._id === e)) return [s, e];
  }
  return a.length ? [a[0]._id, a[Math.min(1, a.length - 1)]._id] : null;
}

// q2/q3 default-month helper, same as driver -- middle month of the loaded calendar
async function pickMonth(db, c) {
  const a = await db
    .collection("calendar")
    .aggregate([
      { $match: { city: c } },
      { $group: { _id: { $substr: ["$date", 0, 7] }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  return a.length ? a[Math.floor(a.length / 2)]._id : null;
}

// run once at startup: spin mongo, load all four collections, pre-pick demo defaults
// listening on the port happens immediately (see app.listen below) so /api/health can answer
// "still loading" instead of refusing connections
async function boot() {
  console.log("[web] starting mongodb-memory-server");
  G_MEM = await MongoMemoryServer.create({
    binary: { version: "8.0.3", downloadDir: path.join(__dirname, "..", "..", "task3-deliverables", "data", "mongodb-binaries") },
  });
  const u = G_MEM.getUri();
  console.log(`[web] uri ${u}`);
  G_CLIENT = new MongoClient(u);
  await G_CLIENT.connect();
  G_DB = G_CLIENT.db("airbnb_stage3");

  console.log("[web] loading data");
  S.counts = await A.load(G_DB);
  S.dates = await pickDates(G_DB, "portland");
  S.month_portland = await pickMonth(G_DB, "portland");
  S.month_salem = await pickMonth(G_DB, "salem");
  S.year_default = (S.month_portland || "2025-12").substring(0, 4);
  S.ready = true;
  console.log("[web] ready", { counts: S.counts, q1_dates: S.dates, q2_month: S.month_portland, q3_month: S.month_salem, q4_year: S.year_default });
}

// fire-and-forget; we still want app.listen to start so frontend gets boot status, not a connection refused
boot().catch((e) => {
  console.error("[web] boot failed", e);
  S.err = String(e && e.message ? e.message : e);
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// frontend polls this until ready=true; also exposes pre-picked demo defaults so the UI can
// render hints like "suggested month: 2025-09" before the user hits any query
app.get("/api/health", (_req, res) => {
  res.json({
    ready: S.ready,
    err: S.err,
    counts: S.counts,
    q1_default_dates: S.dates,
    q2_default_month: S.month_portland,
    q3_default_month: S.month_salem,
    q4_default_year: S.year_default,
    uptime_ms: Date.now() - S.startedAt,
  });
});

// every query route runs through this guard so requests during boot get a 503 instead of a crash
function gate(req, res) {
  if (!S.ready) {
    res.status(503).json({ error: "data still loading", ready: false });
    return false;
  }
  return true;
}

app.get("/api/q1", async (req, res) => {
  if (!gate(req, res)) return;
  try {
    const c = (req.query.city || "portland").toString();
    const a = req.query.from ? req.query.from.toString() : null;
    const b = req.query.to ? req.query.to.toString() : null;
    let d = null;
    // user-provided window OR auto-pick a known-good pair from the loaded data
    if (a && b) d = [a, b];
    else d = await pickDates(G_DB, c);
    if (!d) return res.json({ city: c, dates: null, results: [] });
    const l = req.query.limit ? Number(req.query.limit) : 25;
    const r = await B.run(G_DB, { city: c, dates: d, limit: l });
    res.json({ city: c, dates: d, results: r });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

// q5 takes no params -- it's a global aggregation over the entire reviews collection
app.get("/api/q5", async (_req, res) => {
  if (!gate(_req, res)) return;
  try {
    const r = await C.run(G_DB);
    res.json({ results: r });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

app.get("/api/q6", async (req, res) => {
  if (!gate(req, res)) return;
  try {
    const l = req.query.limit ? Number(req.query.limit) : 25;
    const r = await D.run(G_DB, { limit: l });
    res.json({ results: r });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

app.get("/api/q2", async (req, res) => {
  if (!gate(req, res)) return;
  try {
    const c = (req.query.city || "portland").toString();
    // fall back to the pre-picked demo month so the UI always returns SOMETHING on first click
    const m = (req.query.month || S.month_portland || "2025-12").toString();
    const r = await G.run(G_DB, { city: c, month: m });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

app.get("/api/q3", async (req, res) => {
  if (!gate(req, res)) return;
  try {
    const c = (req.query.city || "salem").toString();
    const m = (req.query.month || S.month_salem || S.month_portland || "2025-12").toString();
    const t = (req.query.room_type || "Entire home/apt").toString();
    const r = await H.run(G_DB, { city: c, room_type: t, month: m });
    res.json({ city: c, month: m, room_type: t, results: r });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

app.get("/api/q4", async (req, res) => {
  if (!gate(req, res)) return;
  try {
    const c = (req.query.city || "portland").toString();
    const y = (req.query.year || S.year_default || "2025").toString();
    const t = (req.query.room_type || "Entire home/apt").toString();
    const r = await I.run(G_DB, { city: c, year: y, room_type: t });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

app.listen(P, () => {
  console.log(`[web] listening on http://localhost:${P}`);
});

// SIGINT/SIGTERM handlers so the mongo subprocess gets reaped on Ctrl+C
async function shutdown() {
  console.log("[web] shutdown");
  try {
    if (G_CLIENT) await G_CLIENT.close();
  } catch (e) {}
  try {
    if (G_MEM) await G_MEM.stop();
  } catch (e) {}
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
