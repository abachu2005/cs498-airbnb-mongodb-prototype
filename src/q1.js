// q1: highest-rated listings in <city> whose calendar is open for every date in o.dates
// driven from calendar (smaller per-day match against the date-window index) instead of
// listings -> calendar lookups (which would scan all listings before filtering)
function pipe(o) {
  return [
    // hits the (city, date, available) index, returns one calendar row per (listing, date) pair
    { $match: { city: o.city, date: { $in: o.dates }, available: true } },
    // collapse to one doc per listing with its open-day count
    { $group: { _id: "$listing_id", a: { $sum: 1 } } },
    // keep only listings open on every requested date (count must equal dates.length)
    { $match: { a: o.dates.length } },
    // pull listing-level fields for display, joined via the unique (city, listing_id) index
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
    // flatten the lookup result and ditch the wrapper so we return clean listing docs
    { $unwind: "$b" },
    { $replaceRoot: { newRoot: "$b" } },
    // best-rated first, listing_id as tiebreaker so results are deterministic
    { $sort: { review_scores_rating: -1, listing_id: 1 } },
    { $limit: o.limit || 25 },
  ];
}

async function run(db, o) {
  const a = pipe(o);
  return db.collection("calendar").aggregate(a).toArray();
}

// same pipeline, but ask the planner to dump executionStats so the report can cite real numbers
async function explain(db, o) {
  const a = pipe(o);
  return db.collection("calendar").aggregate(a).explain("executionStats");
}

module.exports = { run, explain, pipe };
