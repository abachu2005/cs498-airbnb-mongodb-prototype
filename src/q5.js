// q5: count of december reviews per (city, year) -- one pure aggregation over the reviews collection
// no index helps here (we filter by month-of-date, not a prefix), so this is an honest COLLSCAN
// kept as a scan deliberately to demonstrate the cost of querying on a derived date component
function pipe() {
  return [
    // regex on YYYY-12-DD picks every december review across all years; full collection scan
    { $match: { date: { $regex: /^\d{4}-12-\d{2}$/ } } },
    // group by (city, year-extracted-from-date); $substr is cheap once we're already scanning
    {
      $group: {
        _id: { city: "$city", year: { $substr: ["$date", 0, 4] } },
        review_count: { $sum: 1 },
      },
    },
    // flatten the compound _id so callers get a clean shape
    {
      $project: {
        _id: 0,
        city: "$_id.city",
        year: "$_id.year",
        review_count: 1,
      },
    },
    { $sort: { city: 1, year: 1 } },
  ];
}

async function run(db) {
  return db.collection("reviews").aggregate(pipe()).toArray();
}

async function explain(db) {
  return db.collection("reviews").aggregate(pipe()).explain("executionStats");
}

module.exports = { run, explain, pipe };
