// q3: for each entire-home listing in <city>, find every bookable interval inside <month>
// "bookable" is stricter than "available": each day in the run must have enough remaining
// consecutive available days to satisfy that day's minimum_nights (host's stay-length rule)
// runs the interval scanner in app code -- mongo can't express this with aggregation alone

// month string "YYYY-MM" -> [first, last] inclusive bounds; same trick as q2 (-31 always safe)
function mb(m) {
  return [`${m}-01`, `${m}-31`];
}

// true iff b is the calendar day immediately after a
// guards against gaps in the calendar (insideairbnb sometimes skips a day for a listing)
function nx(a, b) {
  if (!a || !b) return false;
  const x = new Date(`${a}T00:00:00Z`);
  const y = new Date(`${b}T00:00:00Z`);
  return y.getTime() - x.getTime() === 86400000;
}

// core scanner: walk a listing's sorted calendar rows, output [{from, to, min_nights}]
// algorithm:
//   1) skip unavailable days
//   2) j = end of the current run of consecutive available days
//   3) inside that run, keep day k only if remaining length (j-k) >= that day's min_nights
//   4) collapse adjacent kept days back into [from, to] ranges
function intervals(r) {
  const o = [];
  let i = 0;
  while (i < r.length) {
    if (!r[i].available) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < r.length && r[j].available && nx(r[j - 1].date, r[j].date)) j++;
    // v = indices of days within [i, j) that pass the min-nights test
    const v = [];
    for (let k = i; k < j; k++) {
      const m = j - k;
      const n = r[k].minimum_nights || 1;
      if (m >= n) v.push(k);
    }
    // s/p track the start/end indices of the current "kept" run as we collapse
    let s = -1;
    let p = -1;
    for (let k = 0; k < v.length; k++) {
      const x = v[k];
      if (s === -1) {
        s = x;
        p = x;
      } else if (x === p + 1) {
        p = x;
      } else {
        o.push({ from: r[s].date, to: r[p].date, min_nights: r[s].minimum_nights });
        s = x;
        p = x;
      }
    }
    if (s !== -1) o.push({ from: r[s].date, to: r[p].date, min_nights: r[s].minimum_nights });
    i = j;
  }
  return o;
}

// candidate listings narrowed by the (city, neighborhood, room_type) index prefix on (city, room_type)
async function listingsFor(db, c, t) {
  return db
    .collection("listings")
    .find({ city: c, room_type: t }, { projection: { _id: 0, listing_id: 1, name: 1 } })
    .toArray();
}

async function run(db, o) {
  const c = o.city;
  const t = o.room_type || "Entire home/apt";
  const m = o.month;
  const [s, e] = mb(m);

  const a = await listingsFor(db, c, t);
  const b = a.map((x) => x.listing_id);
  if (!b.length) return [];

  // single bulk read of every relevant calendar row, sorted so the scanner can walk in order
  // hits the (city, listing_id, date) index, projection keeps doc size small
  const k = await db
    .collection("calendar")
    .find(
      { city: c, listing_id: { $in: b }, date: { $gte: s, $lte: e } },
      { projection: { _id: 0, listing_id: 1, date: 1, available: 1, minimum_nights: 1 } }
    )
    .sort({ listing_id: 1, date: 1 })
    .toArray();

  // bucket calendar rows by listing so the scanner operates on each listing in isolation
  const g = new Map();
  for (const r of k) {
    if (!g.has(r.listing_id)) g.set(r.listing_id, []);
    g.get(r.listing_id).push(r);
  }

  const out = [];
  for (const l of a) {
    const r = g.get(l.listing_id) || [];
    if (!r.length) continue;
    const iv = intervals(r);
    if (!iv.length) continue;
    out.push({ listing_id: l.listing_id, listing_name: l.name, month: m, intervals: iv });
  }
  // most-bookable listings first, listing_id as tiebreaker for determinism
  out.sort((p, q) => q.intervals.length - p.intervals.length || p.listing_id - q.listing_id);
  return out;
}

// explain only the indexed candidate-fetch step; the interval scanner is app-side and not pipelined
async function explain(db, o) {
  const c = o.city;
  const t = o.room_type || "Entire home/apt";
  return db
    .collection("listings")
    .find({ city: c, room_type: t }, { projection: { _id: 0, listing_id: 1 } })
    .explain("executionStats");
}

module.exports = { run, explain, intervals };
