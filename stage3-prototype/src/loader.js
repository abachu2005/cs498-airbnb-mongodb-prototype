// loader: streams the four insideairbnb csvs per city straight into mongo
// nothing here is held fully in memory -- the calendar files alone are 23M+ rows
// p = streaming csv parser, ps = sync parser used only for the small uncompressed nbhd file
const z = require("zlib");
const { Readable } = require("stream");
const { parse: p } = require("csv-parse");
const { parse: ps } = require("csv-parse/sync");

// city -> dataset urls, snapshot dates baked in per city (insideairbnb publishes per snapshot)
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

// env override, accepts a number or "all" / "Infinity", falls back to d
function envN(k, d) {
  const v = process.env[k];
  if (v == null || v === "") return d;
  if (v === "all" || v === "ALL" || v === "Infinity") return Infinity;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

// per-collection row caps, default Infinity = full insideairbnb snapshot
// LIMIT_* env vars let the fast/demo modes cap at a few thousand rows for ~10s boots
const L = {
  listings: envN("LIMIT_LISTINGS", Infinity),
  reviews: envN("LIMIT_REVIEWS", Infinity),
  neighborhoods: envN("LIMIT_NEIGHBORHOODS", Infinity),
  calendar: envN("LIMIT_CALENDAR", Infinity),
};

// fetch a csv into an array (g = gzipped), used by callers that want everything in memory
// kept around for small files only; the big csvs go through fStream instead
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
  return n === Infinity ? w : w.slice(0, n);
}

// streaming variant: fetch -> gunzip -> csv parse -> shape via fn -> push into sink
// stops early once n rows seen, never holds the full file in memory (this is what makes
// loading 16M LA calendar rows possible inside mongodb-memory-server)
async function fStream(u, n, g, fn, sink) {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
  if (!g) {
    const t = Buffer.from(await r.arrayBuffer()).toString("utf-8");
    const w = ps(t, { columns: true, skip_empty_lines: true, relax_column_count: true, relax_quotes: true });
    const a = n === Infinity ? w : w.slice(0, n);
    let c = 0;
    for (const r of a) {
      const v = fn(r);
      if (v) {
        sink.push(v);
        c++;
      }
    }
    await sink.flush();
    return c;
  }
  const a = Readable.fromWeb(r.body);
  const b = z.createGunzip();
  const c = a.pipe(b).pipe(p({ columns: true, skip_empty_lines: true, relax_column_count: true, relax_quotes: true }));
  let i = 0;
  for await (const e of c) {
    if (i >= n) {
      c.destroy();
      break;
    }
    const v = fn(e);
    if (v) await sink.push(v);
    i++;
  }
  await sink.flush();
  b.destroy();
  a.destroy();
  return i;
}

// batched insertMany sink so the heap stays flat regardless of total row count
// ordered:false lets a single bad row not abort the whole batch (insideairbnb has occasional dupes)
function makeSink(coll, batch) {
  const b = batch || 5000;
  let buf = [];
  let total = 0;
  return {
    async push(d) {
      buf.push(d);
      if (buf.length >= b) {
        const x = buf;
        buf = [];
        await coll.insertMany(x, { ordered: false });
        total += x.length;
      }
    },
    async flush() {
      if (buf.length) {
        await coll.insertMany(buf, { ordered: false });
        total += buf.length;
        buf = [];
      }
    },
    get total() {
      return total;
    },
  };
}

// numeric coerce, strips $ and , so "$1,250.00" parses cleanly, returns null on bad input
function n(v) {
  if (v === undefined || v === null || v === "") return null;
  const x = Number(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(x) ? x : null;
}

// listings doc shape, c = city tag, r = raw csv row
// description is trimmed to 200 chars -- no query needs the full text and it bloats mem
// neighbourhood_cleansed is preferred over neighbourhood (insideairbnb's curated value)
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

// reviews doc shape, comments trimmed to 200 chars (q5/q6 only need date + ids)
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

// neighborhoods doc shape -- insideairbnb uses two slightly different column names across cities
function dn(c, r) {
  return {
    city: c,
    neighborhood: r.neighbourhood || r.neighbourhood_group || null,
  };
}

// calendar doc shape, "t"/"f" -> bool so q1/q2/q3 can match on `available: true` directly
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

// boots all four collections, walks each city, indexes after load (faster than indexing-as-we-go)
// batch sizes (2k/5k/1k/10k) tuned per collection so each insertMany stays under ~10MB on the wire
async function load(db) {
  const lc = db.collection("listings");
  const rc = db.collection("reviews");
  const nc = db.collection("neighborhoods");
  const cc = db.collection("calendar");

  // dedup set for neighborhoods -- insideairbnb sometimes lists the same nbhd twice in one csv
  // and we have a unique index on (city, neighborhood) so collisions would crash insertMany
  const seen = new Set();

  let TL = 0;
  let TR = 0;
  let TN = 0;
  let TC = 0;

  for (const [k, v] of Object.entries(S)) {
    console.log(`[loader] ${k} listings`);
    const sL = makeSink(lc, 2000);
    TL += await fStream(v.listings, L.listings, true, (r) => dl(k, r), sL);

    console.log(`[loader] ${k} reviews`);
    const sR = makeSink(rc, 5000);
    TR += await fStream(v.reviews, L.reviews, true, (r) => dr(k, r), sR);

    console.log(`[loader] ${k} neighborhoods`);
    const sN = makeSink(nc, 1000);
    TN += await fStream(v.neighborhoods, L.neighborhoods, false, (r) => {
      const m = dn(k, r);
      if (!m.neighborhood) return null;
      const q = `${m.city}|${m.neighborhood}`;
      if (seen.has(q)) return null;
      seen.add(q);
      return m;
    }, sN);

    console.log(`[loader] ${k} calendar`);
    const sC = makeSink(cc, 10000);
    TC += await fStream(v.calendar, L.calendar, true, (r) => dc(k, r), sC);
  }

  // the eight stage 2 indexes -- creating after the load is ~2x faster than maintaining per-insert
  console.log("[loader] indexing");
  await lc.createIndex({ city: 1, listing_id: 1 }, { unique: true });   // pk-style listing lookup
  await lc.createIndex({ city: 1, neighborhood: 1, room_type: 1 });     // q1 / q2 / q3 candidate filter
  await lc.createIndex({ host_id: 1, city: 1 });                         // q6 same-host lookup (see report critique on key order)
  await cc.createIndex({ city: 1, listing_id: 1, date: 1 });             // per-listing calendar scan (q3, q4, q6)
  await cc.createIndex({ city: 1, date: 1, available: 1 });              // date-window scan (q1, q2)
  await rc.createIndex({ city: 1, listing_id: 1, date: 1 });             // per-listing reviews (q6)
  await rc.createIndex({ reviewer_id: 1, listing_id: 1, date: 1 });      // q6 repeat-reviewer aggregation prefix
  await nc.createIndex({ city: 1, neighborhood: 1 }, { unique: true });  // q2 anti-join target + dedup safety net

  const cl = await lc.estimatedDocumentCount();
  const cr = await rc.estimatedDocumentCount();
  const cn = await nc.estimatedDocumentCount();
  const cc2 = await cc.estimatedDocumentCount();

  return { listings: cl, reviews: cr, neighborhoods: cn, calendar: cc2 };
}

module.exports = { load };
