const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");
const { parse } = require("csv-parse/sync");
const zlib = require("zlib");
const fs = require("fs/promises");

const SOURCES = {
  los_angeles: {
    listings:
      "https://data.insideairbnb.com/united-states/ca/los-angeles/2025-12-04/data/listings.csv.gz",
    reviews:
      "https://data.insideairbnb.com/united-states/ca/los-angeles/2025-12-04/data/reviews.csv.gz",
    neighborhoods:
      "https://data.insideairbnb.com/united-states/ca/los-angeles/2025-12-04/visualisations/neighbourhoods.csv",
    calendar:
      "https://data.insideairbnb.com/united-states/ca/los-angeles/2025-12-04/data/calendar.csv.gz",
  },
  portland: {
    listings:
      "https://data.insideairbnb.com/united-states/or/portland/2025-12-04/data/listings.csv.gz",
    reviews:
      "https://data.insideairbnb.com/united-states/or/portland/2025-12-04/data/reviews.csv.gz",
    neighborhoods:
      "https://data.insideairbnb.com/united-states/or/portland/2025-12-04/visualisations/neighbourhoods.csv",
    calendar:
      "https://data.insideairbnb.com/united-states/or/portland/2025-12-04/data/calendar.csv.gz",
  },
  salem: {
    listings:
      "https://data.insideairbnb.com/united-states/or/salem-or/2025-12-28/data/listings.csv.gz",
    reviews:
      "https://data.insideairbnb.com/united-states/or/salem-or/2025-12-28/data/reviews.csv.gz",
    neighborhoods:
      "https://data.insideairbnb.com/united-states/or/salem-or/2025-12-28/visualisations/neighbourhoods.csv",
    calendar:
      "https://data.insideairbnb.com/united-states/or/salem-or/2025-12-28/data/calendar.csv.gz",
  },
  san_diego: {
    listings:
      "https://data.insideairbnb.com/united-states/ca/san-diego/2025-09-25/data/listings.csv.gz",
    reviews:
      "https://data.insideairbnb.com/united-states/ca/san-diego/2025-09-25/data/reviews.csv.gz",
    neighborhoods:
      "https://data.insideairbnb.com/united-states/ca/san-diego/2025-09-25/visualisations/neighbourhoods.csv",
    calendar:
      "https://data.insideairbnb.com/united-states/ca/san-diego/2025-09-25/data/calendar.csv.gz",
  },
};

const LIMITS = { listings: 50, reviews: 80, neighborhoods: 30, calendar: 120 };

async function fetchCsvRows(url, limit, gz = false) {
  console.log(`  Fetching ${url.split("/").pop()} (limit ${limit}) ...`);
  const { Readable } = require("stream");
  const { parse: parseStream } = require("csv-parse");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  if (gz) {
    const nodeStream = Readable.fromWeb(res.body);
    const gunzip = zlib.createGunzip();
    const parser = nodeStream.pipe(gunzip).pipe(
      parseStream({ columns: true, skip_empty_lines: true, relax_column_count: true })
    );
    const rows = [];
    for await (const record of parser) {
      rows.push(record);
      if (rows.length >= limit) { parser.destroy(); break; }
    }
    gunzip.destroy();
    nodeStream.destroy();
    return rows;
  }

  const text = Buffer.from(await res.arrayBuffer()).toString("utf-8");
  const rows = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true });
  return rows.slice(0, limit);
}

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function listingDoc(city, r) {
  return {
    city,
    listing_id: num(r.id),
    name: r.name || null,
    neighbourhood_cleansed: r.neighbourhood_cleansed || r.neighbourhood || null,
    neighborhood: r.neighbourhood_cleansed || r.neighbourhood || null,
    room_type: r.room_type || null,
    property_type: r.property_type || null,
    accommodates: num(r.accommodates),
    price: num(r.price),
    minimum_nights: num(r.minimum_nights),
    maximum_nights: num(r.maximum_nights),
    host_id: num(r.host_id),
    host_name: r.host_name || null,
    review_scores_rating: num(r.review_scores_rating),
    listing_url: r.listing_url || null,
    description: r.description ? r.description.substring(0, 200) : null,
    amenities: r.amenities || null,
  };
}

function reviewDoc(city, r) {
  return {
    city,
    listing_id: num(r.listing_id),
    review_id: num(r.id),
    date: r.date || null,
    reviewer_id: num(r.reviewer_id),
    reviewer_name: r.reviewer_name || null,
    comments: r.comments ? r.comments.substring(0, 200) : null,
  };
}

function neighborhoodDoc(city, r) {
  return {
    city,
    neighborhood: r.neighbourhood || r.neighbourhood_group || null,
  };
}

function calendarDoc(city, r) {
  return {
    city,
    listing_id: num(r.listing_id),
    date: r.date || null,
    available: r.available === "t",
    price: num(r.price),
    adjusted_price: num(r.adjusted_price),
    minimum_nights: num(r.minimum_nights),
    maximum_nights: num(r.maximum_nights),
  };
}

async function main() {
  console.log("Starting mongodb-memory-server ...");
  const mongod = await MongoMemoryServer.create({
    binary: { version: "8.0.3", downloadDir: "./data/mongodb-binaries" },
  });
  const uri = mongod.getUri();
  console.log("MongoDB URI:", uri);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("airbnb_task3");

  try {
    const allListings = [];
    const allReviews = [];
    const allNeighborhoods = [];
    const allCalendar = [];

    for (const [city, urls] of Object.entries(SOURCES)) {
      console.log(`\nLoading ${city} ...`);

      const listingRows = await fetchCsvRows(urls.listings, LIMITS.listings, true);
      allListings.push(...listingRows.map((r) => listingDoc(city, r)));

      const reviewRows = await fetchCsvRows(urls.reviews, LIMITS.reviews, true);
      allReviews.push(...reviewRows.map((r) => reviewDoc(city, r)));

      const neighborhoodRows = await fetchCsvRows(urls.neighborhoods, LIMITS.neighborhoods, false);
      allNeighborhoods.push(...neighborhoodRows.map((r) => neighborhoodDoc(city, r)));

      const calendarRows = await fetchCsvRows(urls.calendar, LIMITS.calendar, true);
      allCalendar.push(...calendarRows.map((r) => calendarDoc(city, r)));
    }

    console.log("\nInserting documents ...");
    await db.collection("listings").insertMany(allListings);
    await db.collection("reviews").insertMany(allReviews);
    await db.collection("neighborhoods").insertMany(allNeighborhoods);
    await db.collection("calendar").insertMany(allCalendar);

    console.log("Creating indexes ...");
    await db.collection("listings").createIndex({ city: 1, listing_id: 1 }, { unique: true });
    await db.collection("listings").createIndex({ city: 1, neighborhood: 1, room_type: 1 });
    await db.collection("listings").createIndex({ host_id: 1, city: 1 });
    await db.collection("reviews").createIndex({ city: 1, listing_id: 1, date: 1 });
    await db.collection("reviews").createIndex({ reviewer_id: 1, listing_id: 1, date: 1 });
    await db.collection("calendar").createIndex({ city: 1, listing_id: 1, date: 1 });
    await db.collection("calendar").createIndex({ city: 1, date: 1, available: 1 });
    await db.collection("neighborhoods").createIndex({ city: 1, neighborhood: 1 }, { unique: true });

    const counts = {
      listings: await db.collection("listings").countDocuments(),
      reviews: await db.collection("reviews").countDocuments(),
      neighborhoods: await db.collection("neighborhoods").countDocuments(),
      calendar: await db.collection("calendar").countDocuments(),
    };

    const sampleListings = await db
      .collection("listings")
      .find({ city: "portland" }, { projection: { _id: 0, city: 1, listing_id: 1, name: 1, neighborhood: 1, room_type: 1, accommodates: 1, price: 1, review_scores_rating: 1, host_name: 1 } })
      .limit(3)
      .toArray();

    const sampleCalendar = await db
      .collection("calendar")
      .find({ city: "salem" }, { projection: { _id: 0, city: 1, listing_id: 1, date: 1, available: 1, minimum_nights: 1, maximum_nights: 1, price: 1 } })
      .limit(3)
      .toArray();

    const sampleReviews = await db
      .collection("reviews")
      .find({ city: "san_diego" }, { projection: { _id: 0, city: 1, listing_id: 1, date: 1, reviewer_id: 1, reviewer_name: 1 } })
      .limit(3)
      .toArray();

    const sampleNeighborhoods = await db
      .collection("neighborhoods")
      .find({ city: "los_angeles" }, { projection: { _id: 0 } })
      .limit(4)
      .toArray();

    const listingIndexes = await db.collection("listings").indexes();
    const calendarIndexes = await db.collection("calendar").indexes();
    const reviewIndexes = await db.collection("reviews").indexes();
    const neighborhoodIndexes = await db.collection("neighborhoods").indexes();

    function fmtIdx(idxList) {
      return idxList
        .filter((i) => i.name !== "_id_")
        .map((i) => {
          const keys = Object.keys(i.key).join(", ");
          return `  { ${keys} }` + (i.unique ? " [unique]" : "");
        })
        .join("\n");
    }

    const transcript = [
      "$ mongosh <local-uri> --quiet --eval \"...\"",
      "",
      `Connected DB: ${db.databaseName}`,
      "",
      "Collection counts:",
      `  listings:       ${counts.listings}`,
      `  reviews:        ${counts.reviews}`,
      `  neighborhoods:  ${counts.neighborhoods}`,
      `  calendar:       ${counts.calendar}`,
      "",
      "Sample listings (Portland):",
      ...sampleListings.map((d) => JSON.stringify(d, null, 2)),
      "",
      "Sample calendar rows (Salem):",
      ...sampleCalendar.map((d) => JSON.stringify(d, null, 2)),
      "",
      "Sample reviews (San Diego):",
      ...sampleReviews.map((d) => JSON.stringify(d, null, 2)),
      "",
      "Sample neighborhoods (Los Angeles):",
      ...sampleNeighborhoods.map((d) => JSON.stringify(d, null, 2)),
      "",
      "Indexes on listings:",
      fmtIdx(listingIndexes),
      "",
      "Indexes on calendar:",
      fmtIdx(calendarIndexes),
      "",
      "Indexes on reviews:",
      fmtIdx(reviewIndexes),
      "",
      "Indexes on neighborhoods:",
      fmtIdx(neighborhoodIndexes),
    ].join("\n");

    await fs.writeFile("assets/mongosh_evidence_session.txt", transcript, "utf-8");
    await fs.writeFile("assets/mongo_load_output.txt", transcript, "utf-8");
    console.log("\nEvidence written to assets/mongosh_evidence_session.txt");
    console.log("Counts:", counts);
  } finally {
    await client.close();
    await mongod.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
