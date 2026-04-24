// q6: re-book reminders -- for every (city, listing, reviewer) the same guest reviewed twice+,
// surface the listing, the host's other listings in the same city, and current calendar status
// designed as one aggregation + a small batch of indexed point reads per row, NOT one giant
// nested $lookup pipeline -- the latter blows out memory on 3M reviews and is harder to explain

// stage 1: pull every (city, listing, reviewer) combo with >1 review
// hits the (reviewer_id, listing_id, date) index prefix
function repeatPipe() {
  return [
    { $match: { reviewer_id: { $ne: null } } },
    {
      $group: {
        _id: { city: "$city", listing_id: "$listing_id", reviewer_id: "$reviewer_id" },
        review_dates: { $push: "$date" },
        review_count: { $sum: 1 },
      },
    },
    { $match: { review_count: { $gt: 1 } } },
    { $sort: { "_id.city": 1, "_id.listing_id": 1 } },
  ];
}

// review date "YYYY-MM-DD" -> [first, last] of that month; same -31 trick as q2/q3
function mb(d) {
  const a = d.substring(0, 7);
  const b = `${a}-01`;
  const c = `${a}-31`;
  return [b, c];
}

async function run(db, o) {
  const a = await db.collection("reviews").aggregate(repeatPipe()).toArray();
  const b = [];
  const c = o && o.limit ? o.limit : 25;

  // per repeat-pair: 4 indexed reads max (listing point lookup, calendar day check,
  // calendar min/max aggregate, same-host listings find) -- cheap because each is index-driven
  for (const g of a) {
    if (b.length >= c) break;

    // listing point lookup via unique (city, listing_id) index
    const h = await db.collection("listings").findOne(
      { city: g._id.city, listing_id: g._id.listing_id },
      { projection: { _id: 0, name: 1, listing_url: 1, description: 1, host_id: 1, host_name: 1 } }
    );
    if (!h) continue;

    // one reminder row per review-date this guest left -- preserves the time dimension
    for (const d of g.review_dates) {
      if (!d) continue;
      const [s, e] = mb(d);

      // any availability in the same month as the review? hits the (city, listing_id, date) index
      const k = await db.collection("calendar").findOne({
        city: g._id.city,
        listing_id: g._id.listing_id,
        date: { $gte: s, $lte: e },
        available: true,
      });

      // pull min/max stay rules from the same calendar window for display
      const m = await db
        .collection("calendar")
        .aggregate([
          { $match: { city: g._id.city, listing_id: g._id.listing_id, date: { $gte: s, $lte: e } } },
          { $group: { _id: null, mn: { $min: "$minimum_nights" }, mx: { $max: "$maximum_nights" } } },
        ])
        .toArray();

      // host's OTHER listings in the same city, capped at 10 for display
      // uses the (host_id, city) index -- key order critiqued in the report (city should come first)
      const q = await db
        .collection("listings")
        .find(
          { city: g._id.city, host_id: h.host_id, listing_id: { $ne: g._id.listing_id } },
          { projection: { _id: 0, name: 1, listing_url: 1 } }
        )
        .limit(10)
        .toArray();

      b.push({
        listing_name: h.name,
        listing_url: h.listing_url,
        description: h.description,
        host_name: h.host_name,
        reviewer_id: g._id.reviewer_id,
        previously_booked: true,
        month: d.substring(0, 7),
        min_nights: m.length ? m[0].mn : null,
        max_nights: m.length ? m[0].mx : null,
        available_in_same_month: !!k,
        other_host_listings_same_city: q,
      });

      if (b.length >= c) break;
    }
  }

  return b;
}

// explain only the headline aggregation -- the per-row point reads are tracked by their own indexes
async function explain(db) {
  return db.collection("reviews").aggregate(repeatPipe()).explain("executionStats");
}

module.exports = { run, explain, repeatPipe };
