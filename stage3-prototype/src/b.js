function pipe(o) {
  return [
    { $match: { city: o.city, date: { $in: o.dates }, available: true } },
    { $group: { _id: "$listing_id", a: { $sum: 1 } } },
    { $match: { a: o.dates.length } },
    {
      $lookup: {
        from: "listings",
        let: { l: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$city", o.city] }, { $eq: ["$listing_id", "$$l"] }] } } },
          {
            $project: {
              _id: 0,
              listing_id: 1,
              name: 1,
              neighborhood: 1,
              room_type: 1,
              accommodates: 1,
              property_type: 1,
              amenities: 1,
              price: 1,
              review_scores_rating: 1,
            },
          },
        ],
        as: "b",
      },
    },
    { $unwind: "$b" },
    { $replaceRoot: { newRoot: "$b" } },
    { $sort: { review_scores_rating: -1, listing_id: 1 } },
    { $limit: o.limit || 25 },
  ];
}

async function run(db, o) {
  const a = pipe(o);
  return db.collection("calendar").aggregate(a).toArray();
}

async function explain(db, o) {
  const a = pipe(o);
  return db.collection("calendar").aggregate(a).explain("executionStats");
}

module.exports = { run, explain, pipe };
