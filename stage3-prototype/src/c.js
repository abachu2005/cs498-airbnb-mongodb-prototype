function pipe() {
  return [
    { $match: { date: { $regex: /^\d{4}-12-\d{2}$/ } } },
    {
      $group: {
        _id: { city: "$city", year: { $substr: ["$date", 0, 4] } },
        review_count: { $sum: 1 },
      },
    },
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
