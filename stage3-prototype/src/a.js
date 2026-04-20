const z = require("zlib");
const { Readable } = require("stream");
const { parse: p } = require("csv-parse");
const { parse: ps } = require("csv-parse/sync");

const S = {
  los_angeles: {
    listings: "https://data.insideairbnb.com/united-states/ca/los-angeles/2025-12-04/data/listings.csv.gz",
    reviews: "https://data.insideairbnb.com/united-states/ca/los-angeles/2025-12-04/data/reviews.csv.gz",
    neighborhoods: "https://data.insideairbnb.com/united-states/ca/los-angeles/2025-12-04/visualisations/neighbourhoods.csv",
    calendar: "https://data.insideairbnb.com/united-states/ca/los-angeles/2025-12-04/data/calendar.csv.gz",
  },
  portland: {
    listings: "https://data.insideairbnb.com/united-states/or/portland/2025-12-04/data/listings.csv.gz",
    reviews: "https://data.insideairbnb.com/united-states/or/portland/2025-12-04/data/reviews.csv.gz",
    neighborhoods: "https://data.insideairbnb.com/united-states/or/portland/2025-12-04/visualisations/neighbourhoods.csv",
    calendar: "https://data.insideairbnb.com/united-states/or/portland/2025-12-04/data/calendar.csv.gz",
  },
  salem: {
    listings: "https://data.insideairbnb.com/united-states/or/salem-or/2025-12-28/data/listings.csv.gz",
    reviews: "https://data.insideairbnb.com/united-states/or/salem-or/2025-12-28/data/reviews.csv.gz",
    neighborhoods: "https://data.insideairbnb.com/united-states/or/salem-or/2025-12-28/visualisations/neighbourhoods.csv",
    calendar: "https://data.insideairbnb.com/united-states/or/salem-or/2025-12-28/data/calendar.csv.gz",
  },
  san_diego: {
    listings: "https://data.insideairbnb.com/united-states/ca/san-diego/2025-09-25/data/listings.csv.gz",
    reviews: "https://data.insideairbnb.com/united-states/ca/san-diego/2025-09-25/data/reviews.csv.gz",
    neighborhoods: "https://data.insideairbnb.com/united-states/ca/san-diego/2025-09-25/visualisations/neighbourhoods.csv",
    calendar: "https://data.insideairbnb.com/united-states/ca/san-diego/2025-09-25/data/calendar.csv.gz",
  },
};

const L = { listings: 500, reviews: 1000, neighborhoods: 200, calendar: 2000 };

async function f(u, n, g) {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
  if (g) {
    const a = Readable.fromWeb(r.body);
    const b = z.createGunzip();
    const c = a.pipe(b).pipe(p({ columns: true, skip_empty_lines: true, relax_column_count: true, relax_quotes: true }));
    const d = [];
    for await (const e of c) {
      d.push(e);
      if (d.length >= n) { c.destroy(); break; }
    }
    b.destroy();
    a.destroy();
    return d;
  }
  const t = Buffer.from(await r.arrayBuffer()).toString("utf-8");
  const w = ps(t, { columns: true, skip_empty_lines: true, relax_column_count: true, relax_quotes: true });
  return w.slice(0, n);
}

function n(v) {
  if (v === undefined || v === null || v === "") return null;
  const x = Number(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(x) ? x : null;
}

function dl(c, r) {
  return {
    city: c,
    listing_id: n(r.id),
    name: r.name || null,
    neighborhood: r.neighbourhood_cleansed || r.neighbourhood || null,
    room_type: r.room_type || null,
    property_type: r.property_type || null,
    accommodates: n(r.accommodates),
    price: n(r.price),
    minimum_nights: n(r.minimum_nights),
    maximum_nights: n(r.maximum_nights),
    host_id: n(r.host_id),
    host_name: r.host_name || null,
    review_scores_rating: n(r.review_scores_rating),
    listing_url: r.listing_url || null,
    description: r.description ? r.description.substring(0, 200) : null,
    amenities: r.amenities || null,
  };
}

function dr(c, r) {
  return {
    city: c,
    listing_id: n(r.listing_id),
    review_id: n(r.id),
    date: r.date || null,
    reviewer_id: n(r.reviewer_id),
    reviewer_name: r.reviewer_name || null,
    comments: r.comments ? r.comments.substring(0, 200) : null,
  };
}

function dn(c, r) {
  return {
    city: c,
    neighborhood: r.neighbourhood || r.neighbourhood_group || null,
  };
}

function dc(c, r) {
  return {
    city: c,
    listing_id: n(r.listing_id),
    date: r.date || null,
    available: r.available === "t",
    price: n(r.price),
    adjusted_price: n(r.adjusted_price),
    minimum_nights: n(r.minimum_nights),
    maximum_nights: n(r.maximum_nights),
  };
}

async function load(db) {
  const a = [];
  const b = [];
  const c = [];
  const d = [];

  for (const [k, v] of Object.entries(S)) {
    console.log(`[loader] ${k} listings`);
    const e = await f(v.listings, L.listings, true);
    a.push(...e.map((r) => dl(k, r)));

    console.log(`[loader] ${k} reviews`);
    const g = await f(v.reviews, L.reviews, true);
    b.push(...g.map((r) => dr(k, r)));

    console.log(`[loader] ${k} neighborhoods`);
    const h = await f(v.neighborhoods, L.neighborhoods, false);
    const i = new Set();
    for (const r of h) {
      const m = dn(k, r);
      const q = `${m.city}|${m.neighborhood}`;
      if (m.neighborhood && !i.has(q)) {
        i.add(q);
        c.push(m);
      }
    }

    console.log(`[loader] ${k} calendar`);
    const j = await f(v.calendar, L.calendar, true);
    d.push(...j.map((r) => dc(k, r)));
  }

  console.log("[loader] inserting");
  if (a.length) await db.collection("listings").insertMany(a, { ordered: false });
  if (b.length) await db.collection("reviews").insertMany(b, { ordered: false });
  if (c.length) await db.collection("neighborhoods").insertMany(c, { ordered: false });
  if (d.length) await db.collection("calendar").insertMany(d, { ordered: false });

  console.log("[loader] indexing");
  await db.collection("listings").createIndex({ city: 1, listing_id: 1 }, { unique: true });
  await db.collection("listings").createIndex({ city: 1, neighborhood: 1, room_type: 1 });
  await db.collection("listings").createIndex({ host_id: 1, city: 1 });
  await db.collection("calendar").createIndex({ city: 1, listing_id: 1, date: 1 });
  await db.collection("calendar").createIndex({ city: 1, date: 1, available: 1 });
  await db.collection("reviews").createIndex({ city: 1, listing_id: 1, date: 1 });
  await db.collection("reviews").createIndex({ reviewer_id: 1, listing_id: 1, date: 1 });
  await db.collection("neighborhoods").createIndex({ city: 1, neighborhood: 1 }, { unique: true });

  return {
    listings: a.length,
    reviews: b.length,
    neighborhoods: c.length,
    calendar: d.length,
  };
}

module.exports = { load };
