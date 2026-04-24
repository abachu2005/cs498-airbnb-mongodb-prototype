// q4: portland entire-home booking-trend across march -> august of <year>
// composes q3's interval scanner across six months and totals bookable nights per month
// this is the rare query where reuse across modules is exact -- no copy/paste of the scanner
const H = require("./q3");

// fixed march..august window per the assignment's seasonal-demand framing
function months(y) {
  return ["03", "04", "05", "06", "07", "08"].map((m) => `${y}-${m}`);
}

// sum total nights across an array of {from, to} intervals, inclusive on both ends
// +1 because [from=01, to=03] is 3 nights, not 2
function totalNights(iv) {
  let n = 0;
  for (const x of iv) {
    const a = new Date(`${x.from}T00:00:00Z`);
    const b = new Date(`${x.to}T00:00:00Z`);
    n += Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
  }
  return n;
}

async function run(db, o) {
  const c = o.city || "portland";
  const t = o.room_type || "Entire home/apt";
  const y = o.year || "2025";
  const a = months(y);
  const r = [];
  // serial loop on purpose: each q3 run already pulls a sizeable per-listing calendar batch,
  // and parallelising 6 of them blows out the in-memory mongo connection pool
  for (const m of a) {
    const k = await H.run(db, { city: c, room_type: t, month: m });
    let n = 0;
    let l = 0;
    for (const x of k) {
      n += totalNights(x.intervals);
      l += 1;
    }
    r.push({ month: m, listings_with_intervals: l, total_bookable_nights: n });
  }
  return { city: c, room_type: t, year: y, months: r };
}

// reuses q3's explain (the candidate-listing fetch) since that's the only mongo-side step
async function explain(db, o) {
  const c = o.city || "portland";
  const t = o.room_type || "Entire home/apt";
  return H.explain(db, { city: c, room_type: t });
}

module.exports = { run, explain, totalNights };
