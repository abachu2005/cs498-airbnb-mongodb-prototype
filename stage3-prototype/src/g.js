function activePipe(o) {
  return [
    { $match: { city: o.city, date: { $gte: o.from, $lte: o.to }, available: true } },
    { $group: { _id: { c: "$city", l: "$listing_id" } } },
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
    { $group: { _id: { c: "$_id.c", n: "$n.neighborhood" } } },
  ];
}

function mb(m) {
  const a = `${m}-01`;
  const b = `${m}-31`;
  return [a, b];
}

async function run(db, o) {
  const [a, b] = mb(o.month);
  const c = { city: o.city, from: a, to: b };
  const d = await db.collection("calendar").aggregate(activePipe(c)).toArray();
  const e = new Set(d.map((x) => x._id.n));
  const f = await db
    .collection("neighborhoods")
    .find({ city: o.city }, { projection: { _id: 0, neighborhood: 1 } })
    .toArray();
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
