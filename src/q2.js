// q2: neighborhoods in <city> that had ZERO available listings during the given month
// implemented as: positive aggregation (active set) + app-side anti-join against the full nbhd set
// reason for the split: $lookup-based set-difference inside mongo would scan the whole nbhd
// collection per active row, and the active set is small enough to diff in-process trivially
function activePipe(o) {
  return [
    // calendar window narrowed by the (city, date, available) index
    { $match: { city: o.city, date: { $gte: o.from, $lte: o.to }, available: true } },
    // collapse to one row per active listing first, so the lookup runs once per listing not per day
    { $group: { _id: { c: "$city", l: "$listing_id" } } },
    // join to listings just to get the neighborhood field, hits the unique (city, listing_id) index
    {
      $lookup: {
        from: "listings",
        let: { c: "$_id.c", l: "$_id.l" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$city", "$$c"] }, { $eq: ["$listing_id", "$$l"] }] } } },
          { $project: { _id: 0, neighborhood: 1 } },
        ],
        as: "n",
      },
    },
    { $unwind: "$n" },
    // distinct (city, neighborhood) -- this is the "active" set we'll subtract from
    { $group: { _id: { c: "$_id.c", n: "$n.neighborhood" } } },
  ];
}

// month string "YYYY-MM" -> [first, last] inclusive bounds; "31" works for every month because
// $gte/$lte on a string date silently clamps -- no calendar row will have e.g. feb-31
function mb(m) {
  const a = `${m}-01`;
  const b = `${m}-31`;
  return [a, b];
}

async function run(db, o) {
  const [a, b] = mb(o.month);
  const c = { city: o.city, from: a, to: b };
  // active neighborhoods this month
  const d = await db.collection("calendar").aggregate(activePipe(c)).toArray();
  const e = new Set(d.map((x) => x._id.n));
  // every known neighborhood in the city (the universe to subtract from)
  const f = await db
    .collection("neighborhoods")
    .find({ city: o.city }, { projection: { _id: 0, neighborhood: 1 } })
    .toArray();
  // anti-join: full set minus active set -> the "dark" neighborhoods
  const g = f
    .map((x) => x.neighborhood)
    .filter((x) => x && !e.has(x))
    .sort();
  return {
    city: o.city,
    month: o.month,
    total_neighborhoods: f.length,
    active_neighborhoods: e.size,
    empty_neighborhoods: g,
  };
}

async function explain(db, o) {
  const [a, b] = mb(o.month);
  const c = { city: o.city, from: a, to: b };
  return db.collection("calendar").aggregate(activePipe(c)).explain("executionStats");
}

module.exports = { run, explain, activePipe };
