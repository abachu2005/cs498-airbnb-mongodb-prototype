const path = require("path");
const express = require("express");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");

const A = require("../src/a");
const B = require("../src/b");
const C = require("../src/c");
const D = require("../src/d");

const P = process.env.PORT ? Number(process.env.PORT) : 4173;

const S = {
  ready: false,
  err: null,
  counts: null,
  dates: null,
  startedAt: Date.now(),
};

let G_DB = null;
let G_CLIENT = null;
let G_MEM = null;

function ds(s, n) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().substring(0, 10);
}

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

  console.log("[web] loading data (this takes ~10s on first run)");
  S.counts = await A.load(G_DB);
  S.dates = await pickDates(G_DB, "portland");
  S.ready = true;
  console.log("[web] ready", { counts: S.counts, q1_dates: S.dates });
}

boot().catch((e) => {
  console.error("[web] boot failed", e);
  S.err = String(e && e.message ? e.message : e);
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ready: S.ready,
    err: S.err,
    counts: S.counts,
    q1_default_dates: S.dates,
    uptime_ms: Date.now() - S.startedAt,
  });
});

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

app.listen(P, () => {
  console.log(`[web] listening on http://localhost:${P}`);
});

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
