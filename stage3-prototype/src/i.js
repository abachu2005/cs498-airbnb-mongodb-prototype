const H = require("./h");

function months(y) {
  return ["03", "04", "05", "06", "07", "08"].map((m) => `${y}-${m}`);
}

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

async function explain(db, o) {
  const c = o.city || "portland";
  const t = o.room_type || "Entire home/apt";
  return H.explain(db, { city: c, room_type: t });
}

module.exports = { run, explain, totalNights };
