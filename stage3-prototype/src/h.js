function mb(m) {
  return [`${m}-01`, `${m}-31`];
}

function nx(a, b) {
  if (!a || !b) return false;
  const x = new Date(`${a}T00:00:00Z`);
  const y = new Date(`${b}T00:00:00Z`);
  return y.getTime() - x.getTime() === 86400000;
}

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
    const v = [];
    for (let k = i; k < j; k++) {
      const m = j - k;
      const n = r[k].minimum_nights || 1;
      if (m >= n) v.push(k);
    }
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

  const k = await db
    .collection("calendar")
    .find(
      { city: c, listing_id: { $in: b }, date: { $gte: s, $lte: e } },
      { projection: { _id: 0, listing_id: 1, date: 1, available: 1, minimum_nights: 1 } }
    )
    .sort({ listing_id: 1, date: 1 })
    .toArray();

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
  out.sort((p, q) => q.intervals.length - p.intervals.length || p.listing_id - q.listing_id);
  return out;
}

async function explain(db, o) {
  const c = o.city;
  const t = o.room_type || "Entire home/apt";
  return db
    .collection("listings")
    .find({ city: c, room_type: t }, { projection: { _id: 0, listing_id: 1 } })
    .explain("executionStats");
}

module.exports = { run, explain, intervals };
