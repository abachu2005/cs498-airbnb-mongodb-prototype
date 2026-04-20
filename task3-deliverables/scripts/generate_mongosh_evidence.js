const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");
const { parse } = require("csv-parse/sync");
const zlib = require("zlib");
const fs = require("fs/promises");
const { execFileSync } = require("child_process");

const SOURCES = {
  portland_listings:
    "https://data.insideairbnb.com/united-states/or/portland/2025-12-04/visualisations/listings.csv",
  salem_calendar:
    "https://data.insideairbnb.com/united-states/or/salem-or/2025-12-28/data/calendar.csv.gz",
};

async function fetchCsvRows(url, limit = 20, gz = false) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const text = gz ? zlib.gunzipSync(raw).toString("utf-8") : raw.toString("utf-8");
  const rows = parse(text, { columns: true, skip_empty_lines: true });
  return rows.slice(0, limit);
}

function n(v) {
  if (v === undefined || v === null || v === "") return null;
  const parsed = Number(String(v).replace("$", "").replace(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

async function main() {
  const mongod = await MongoMemoryServer.create({
    binary: { version: "8.0.3", downloadDir: "./data/mongodb-binaries" },
  });
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("airbnb_task3");

  try {
    const listingRows = await fetchCsvRows(SOURCES.portland_listings, 25, false);
    const calendarRows = await fetchCsvRows(SOURCES.salem_calendar, 80, true);

    const listingsDocs = listingRows.map((r) => ({
      city: "portland",
      listing_id: n(r.id),
      name: r.name || null,
      room_type: r.room_type || null,
      host_id: n(r.host_id),
      host_name: r.host_name || null,
      minimum_nights: n(r.minimum_nights),
    }));

    const calendarDocs = calendarRows.map((r) => ({
      city: "salem",
      listing_id: n(r.listing_id),
      date: r.date || null,
      available: r.available === "t",
      minimum_nights: n(r.minimum_nights),
      maximum_nights: n(r.maximum_nights),
    }));

    await db.collection("listings").insertMany(listingsDocs);
    await db.collection("calendar").insertMany(calendarDocs);
    await db.collection("listings").createIndex({ city: 1, listing_id: 1 }, { unique: true });
    await db.collection("calendar").createIndex({ city: 1, listing_id: 1, date: 1 });

    const evalScript = `
      use("airbnb_task3");
      print("Connected DB:", db.getName());
      print("Listings count:", db.listings.countDocuments());
      print("Calendar count:", db.calendar.countDocuments());
      print("\\nSample listings:");
      db.listings.find({}, {_id:0, city:1, listing_id:1, name:1, room_type:1, minimum_nights:1}).limit(3).forEach(d => printjson(d));
      print("\\nSample calendar rows:");
      db.calendar.find({}, {_id:0, city:1, listing_id:1, date:1, available:1, minimum_nights:1}).limit(3).forEach(d => printjson(d));
      print("\\nIndexes on listings:");
      db.listings.getIndexes().forEach(i => printjson(i));
    `;

    const output = execFileSync("mongosh", [uri, "--quiet", "--eval", evalScript], {
      encoding: "utf-8",
    });

    const transcript = [
      "$ mongosh <local-uri> --quiet --eval \"...\"",
      output.trim(),
    ].join("\n\n");

    await fs.writeFile("assets/mongosh_evidence_session.txt", transcript, "utf-8");
  } finally {
    await client.close();
    await mongod.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

