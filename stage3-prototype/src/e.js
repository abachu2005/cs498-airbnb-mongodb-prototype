const fs = require("fs/promises");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");

const A = require("./a");
const B = require("./b");
const C = require("./c");
const D = require("./d");
const G = require("./g");
const H = require("./h");
const I = require("./i");

const O = path.join(__dirname, "..", "out");

function ds(s, n) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().substring(0, 10);
}

async function pickPortlandDates(db) {
  const a = await db
    .collection("calendar")
    .aggregate([
      { $match: { city: "portland", available: true } },
      { $group: { _id: "$date", c: { $sum: 1 } } },
      { $match: { c: { $gte: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  for (let i = 0; i < a.length; i++) {
    const s = a[i]._id;
    const e = ds(s, 1);
    if (a.find((x) => x._id === e)) return [s, e];
  }
  return [a[0]._id, a[Math.min(1, a.length - 1)]._id];
}

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

async function fmtIdx(c) {
  const a = await c.indexes();
  return a
    .filter((i) => i.name !== "_id_")
    .map((i) => `  { ${Object.keys(i.key).join(", ")} }${i.unique ? " [unique]" : ""}`)
    .join("\n");
}

async function perCity(db, k) {
  const a = ["los_angeles", "portland", "salem", "san_diego"];
  const r = {};
  for (const c of a) {
    r[c] = await db.collection(k).countDocuments({ city: c });
  }
  return r;
}

async function writeEvidence(db, counts, dates, m2, m3, m4) {
  const a = await db.collection("listings").find({ city: "portland" }, { projection: { _id: 0, listing_id: 1, name: 1, neighborhood: 1, room_type: 1, price: 1, review_scores_rating: 1, host_name: 1 } }).limit(3).toArray();
  const b = await db.collection("calendar").find({ city: "salem" }, { projection: { _id: 0 } }).limit(3).toArray();
  const c = await db.collection("reviews").find({ city: "san_diego" }, { projection: { _id: 0, comments: 0 } }).limit(3).toArray();
  const d = await db.collection("neighborhoods").find({ city: "los_angeles" }, { projection: { _id: 0 } }).limit(4).toArray();

  const pcL = await perCity(db, "listings");
  const pcR = await perCity(db, "reviews");
  const pcC = await perCity(db, "calendar");
  const pcN = await perCity(db, "neighborhoods");

  const fmt = (o) => Object.entries(o).map(([k, v]) => `    ${k.padEnd(14)} ${v.toLocaleString()}`).join("\n");

  const e = [
    "$ npm start  (mongodb-memory-server)",
    "",
    `Connected DB: ${db.databaseName}`,
    "",
    "Collection counts (loaded):",
    `  listings:       ${counts.listings.toLocaleString()}`,
    `  reviews:        ${counts.reviews.toLocaleString()}`,
    `  neighborhoods:  ${counts.neighborhoods.toLocaleString()}`,
    `  calendar:       ${counts.calendar.toLocaleString()}`,
    "",
    "Per-city listings:",
    fmt(pcL),
    "Per-city reviews:",
    fmt(pcR),
    "Per-city calendar:",
    fmt(pcC),
    "Per-city neighborhoods:",
    fmt(pcN),
    "",
    `Q1 demo dates picked from data: ${dates[0]} -> ${dates[1]}`,
    `Q2 demo month: ${m2}`,
    `Q3 demo month: ${m3}`,
    `Q4 demo year:  ${m4}`,
    "",
    "Sample listings (Portland):",
    ...a.map((x) => JSON.stringify(x, null, 2)),
    "",
    "Sample calendar rows (Salem):",
    ...b.map((x) => JSON.stringify(x, null, 2)),
    "",
    "Sample reviews (San Diego):",
    ...c.map((x) => JSON.stringify(x, null, 2)),
    "",
    "Sample neighborhoods (Los Angeles):",
    ...d.map((x) => JSON.stringify(x, null, 2)),
    "",
    "Indexes on listings:",
    await fmtIdx(db.collection("listings")),
    "",
    "Indexes on calendar:",
    await fmtIdx(db.collection("calendar")),
    "",
    "Indexes on reviews:",
    await fmtIdx(db.collection("reviews")),
    "",
    "Indexes on neighborhoods:",
    await fmtIdx(db.collection("neighborhoods")),
  ].join("\n");

  await fs.writeFile(path.join(O, "load_evidence.txt"), e, "utf-8");
}

async function main() {
  await fs.mkdir(O, { recursive: true });
  console.log("[driver] starting mongodb-memory-server");
  const m = await MongoMemoryServer.create({
    binary: { version: "8.0.3", downloadDir: path.join(__dirname, "..", "..", "task3-deliverables", "data", "mongodb-binaries") },
  });
  const u = m.getUri();
  console.log(`[driver] uri ${u}`);
  const c = new MongoClient(u);
  await c.connect();
  const db = c.db("airbnb_stage3");

  try {
    console.log("[driver] loading data");
    const counts = await A.load(db);
    console.log("[driver] counts", counts);

    const dates = await pickPortlandDates(db);
    console.log(`[driver] Q1 dates ${dates[0]} ${dates[1]}`);

    const m2 = await pickMonth(db, "portland");
    const m3 = await pickMonth(db, "salem");
    const m4 = (m2 || "2025-12").substring(0, 4);
    console.log(`[driver] Q2 month ${m2}, Q3 month ${m3}, Q4 year ${m4}`);

    await writeEvidence(db, counts, dates, m2, m3, m4);

    console.log("[driver] running Q1");
    const q1 = await B.run(db, { city: "portland", dates, limit: 25 });
    const q1e = await B.explain(db, { city: "portland", dates, limit: 25 });
    await fs.writeFile(path.join(O, "q1_results.json"), JSON.stringify(q1, null, 2));
    await fs.writeFile(path.join(O, "explain_q1.json"), JSON.stringify(q1e, null, 2));
    console.log(`[driver] Q1 returned ${q1.length} rows`);

    console.log("[driver] running Q2");
    const q2 = await G.run(db, { city: "portland", month: m2 });
    const q2e = await G.explain(db, { city: "portland", month: m2 });
    await fs.writeFile(path.join(O, "q2_results.json"), JSON.stringify(q2, null, 2));
    await fs.writeFile(path.join(O, "explain_q2.json"), JSON.stringify(q2e, null, 2));
    console.log(`[driver] Q2 ${q2.empty_neighborhoods.length}/${q2.total_neighborhoods} neighborhoods empty in ${m2}`);

    console.log("[driver] running Q3");
    const q3 = await H.run(db, { city: "salem", room_type: "Entire home/apt", month: m3 });
    const q3e = await H.explain(db, { city: "salem", room_type: "Entire home/apt" });
    await fs.writeFile(path.join(O, "q3_results.json"), JSON.stringify(q3, null, 2));
    await fs.writeFile(path.join(O, "explain_q3.json"), JSON.stringify(q3e, null, 2));
    console.log(`[driver] Q3 ${q3.length} listings with bookable intervals in ${m3}`);

    console.log("[driver] running Q4");
    const q4 = await I.run(db, { city: "portland", room_type: "Entire home/apt", year: m4 });
    const q4e = await I.explain(db, { city: "portland", room_type: "Entire home/apt" });
    await fs.writeFile(path.join(O, "q4_results.json"), JSON.stringify(q4, null, 2));
    await fs.writeFile(path.join(O, "explain_q4.json"), JSON.stringify(q4e, null, 2));
    console.log(`[driver] Q4 totals per month`, q4.months.map((x) => `${x.month}=${x.total_bookable_nights}`).join(" "));

    console.log("[driver] running Q5");
    const q5 = await C.run(db);
    const q5e = await C.explain(db);
    await fs.writeFile(path.join(O, "q5_results.json"), JSON.stringify(q5, null, 2));
    await fs.writeFile(path.join(O, "explain_q5.json"), JSON.stringify(q5e, null, 2));
    console.log(`[driver] Q5 returned ${q5.length} rows`);

    console.log("[driver] running Q6");
    const q6 = await D.run(db, { limit: 25 });
    const q6e = await D.explain(db);
    await fs.writeFile(path.join(O, "q6_results.json"), JSON.stringify(q6, null, 2));
    await fs.writeFile(path.join(O, "explain_q6.json"), JSON.stringify(q6e, null, 2));
    console.log(`[driver] Q6 returned ${q6.length} rows`);

    const s = {
      counts,
      q1: { rows: q1.length, dates },
      q2: { city: "portland", month: m2, empty: q2.empty_neighborhoods.length, total: q2.total_neighborhoods },
      q3: { city: "salem", month: m3, listings_with_intervals: q3.length },
      q4: { city: "portland", year: m4, months: q4.months },
      q5: { rows: q5.length },
      q6: { rows: q6.length },
    };
    await fs.writeFile(path.join(O, "summary.json"), JSON.stringify(s, null, 2));
    console.log("[driver] done", s);
  } finally {
    await c.close();
    await m.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
