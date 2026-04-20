const fs = require("fs/promises");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");

const A = require("./a");
const B = require("./b");
const C = require("./c");
const D = require("./d");

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

async function fmtIdx(c) {
  const a = await c.indexes();
  return a
    .filter((i) => i.name !== "_id_")
    .map((i) => `  { ${Object.keys(i.key).join(", ")} }${i.unique ? " [unique]" : ""}`)
    .join("\n");
}

async function writeEvidence(db, counts, dates) {
  const a = await db
    .collection("listings")
    .find({ city: "portland" }, { projection: { _id: 0, listing_id: 1, name: 1, neighborhood: 1, room_type: 1, price: 1, review_scores_rating: 1, host_name: 1 } })
    .limit(3)
    .toArray();

  const b = await db
    .collection("calendar")
    .find({ city: "salem" }, { projection: { _id: 0 } })
    .limit(3)
    .toArray();

  const c = await db
    .collection("reviews")
    .find({ city: "san_diego" }, { projection: { _id: 0, comments: 0 } })
    .limit(3)
    .toArray();

  const d = await db
    .collection("neighborhoods")
    .find({ city: "los_angeles" }, { projection: { _id: 0 } })
    .limit(4)
    .toArray();

  const e = [
    "$ npm start  (mongodb-memory-server)",
    "",
    `Connected DB: ${db.databaseName}`,
    "",
    "Collection counts (loaded subset):",
    `  listings:       ${counts.listings}`,
    `  reviews:        ${counts.reviews}`,
    `  neighborhoods:  ${counts.neighborhoods}`,
    `  calendar:       ${counts.calendar}`,
    "",
    `Q1 demo dates picked from data: ${dates[0]} -> ${dates[1]}`,
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

function plan(x) {
  return x;
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

    await writeEvidence(db, counts, dates);

    console.log("[driver] running Q1");
    const q1 = await B.run(db, { city: "portland", dates, limit: 25 });
    const q1e = await B.explain(db, { city: "portland", dates, limit: 25 });
    await fs.writeFile(path.join(O, "q1_results.json"), JSON.stringify(q1, null, 2));
    await fs.writeFile(path.join(O, "explain_q1.json"), JSON.stringify(plan(q1e), null, 2));
    console.log(`[driver] Q1 returned ${q1.length} rows`);

    console.log("[driver] running Q5");
    const q5 = await C.run(db);
    const q5e = await C.explain(db);
    await fs.writeFile(path.join(O, "q5_results.json"), JSON.stringify(q5, null, 2));
    await fs.writeFile(path.join(O, "explain_q5.json"), JSON.stringify(plan(q5e), null, 2));
    console.log(`[driver] Q5 returned ${q5.length} rows`);

    console.log("[driver] running Q6");
    const q6 = await D.run(db, { limit: 25 });
    const q6e = await D.explain(db);
    await fs.writeFile(path.join(O, "q6_results.json"), JSON.stringify(q6, null, 2));
    await fs.writeFile(path.join(O, "explain_q6.json"), JSON.stringify(plan(q6e), null, 2));
    console.log(`[driver] Q6 returned ${q6.length} rows`);

    const s = {
      counts,
      q1_demo_dates: dates,
      q1_rows: q1.length,
      q5_rows: q5.length,
      q6_rows: q6.length,
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
