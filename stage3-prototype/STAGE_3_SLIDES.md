---
marp: true
theme: default
size: 16:9
paginate: true
header: 'CS 498 · Stage 3 Prototype · MongoDB + AirBnB'
footer: 'Bachu · Bahl · Arias'
style: |
  :root {
    --ink:        #1a2236;
    --ink-soft:   #4a5266;
    --bg:         #fafaf7;
    --surface:    #ffffff;
    --line:       #d8d4cc;
    --accent:     #e0224b;
    --accent-2:   #1d6a8d;
    --code-bg:    #f1ede5;
  }
  section {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--ink);
    font-size: 24px;
    line-height: 1.4;
    padding: 60px 70px 60px 70px;
  }
  section header {
    color: var(--ink-soft);
    font-size: 14px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    top: 22px;
    left: 70px;
    font-weight: 600;
  }
  section footer {
    color: var(--ink-soft);
    font-size: 13px;
    bottom: 22px;
    left: 70px;
  }
  section::after {
    color: var(--ink-soft);
    font-size: 13px;
    bottom: 22px;
    right: 70px;
  }
  h1 {
    font-size: 44px;
    color: var(--ink);
    margin: 0 0 18px;
    letter-spacing: -0.01em;
    font-weight: 800;
  }
  h2 {
    font-size: 28px;
    color: var(--accent-2);
    margin: 0 0 14px;
    font-weight: 700;
  }
  h3 {
    font-size: 22px;
    color: var(--ink);
    margin: 18px 0 6px;
    font-weight: 700;
  }
  p, li { color: var(--ink); }
  strong { color: var(--ink); }
  em { color: var(--accent); font-style: normal; font-weight: 700; }
  ul, ol { margin: 6px 0 6px 22px; padding: 0; }
  li { margin: 6px 0; }
  li::marker { color: var(--accent); }
  code {
    background: var(--code-bg);
    color: var(--ink);
    padding: 1px 6px;
    border-radius: 3px;
    font-family: "Menlo", "Monaco", "Consolas", monospace;
    font-size: 0.85em;
  }
  pre {
    background: var(--code-bg);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 18px;
    line-height: 1.45;
    overflow: hidden;
  }
  pre code { background: transparent; padding: 0; font-size: 18px; }
  table {
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 20px;
    width: 100%;
  }
  th, td { border: 1px solid var(--line); padding: 8px 12px; text-align: left; }
  th { background: var(--code-bg); font-weight: 700; color: var(--ink); }
  blockquote {
    border-left: 4px solid var(--accent);
    background: var(--surface);
    padding: 10px 18px;
    margin: 10px 0;
    color: var(--ink);
    font-style: normal;
  }
  hr { border: 0; border-top: 1px solid var(--line); margin: 16px 0; }
  .lede { font-size: 22px; color: var(--ink-soft); margin: 0 0 18px; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .columns-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 22px; }
  .stat {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 14px 18px;
  }
  .stat .num {
    font-size: 30px;
    font-weight: 800;
    color: var(--accent-2);
    line-height: 1;
    margin-bottom: 4px;
  }
  .stat .lbl {
    font-size: 14px;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .pill {
    display: inline-block;
    background: var(--code-bg);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 3px 12px;
    font-size: 16px;
    margin: 2px 4px 2px 0;
    font-weight: 600;
  }
  .pill.ok    { border-color: var(--accent-2); color: var(--accent-2); }
  .pill.warn  { border-color: var(--accent);   color: var(--accent); }
  .speaker { display: none; }

  /* title slide */
  section.title {
    background: linear-gradient(135deg, #1a2236 0%, #1d6a8d 100%);
    color: #fafaf7;
    padding: 80px 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.title header,
  section.title footer,
  section.title::after { color: rgba(250,250,247,0.65); }
  section.title h1 {
    font-size: 64px;
    color: #fafaf7;
    margin-bottom: 20px;
    line-height: 1.05;
  }
  section.title h2 {
    color: #ffd9e0;
    font-size: 26px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  section.title .meta {
    margin-top: 40px;
    font-size: 22px;
    line-height: 1.6;
    color: rgba(250,250,247,0.92);
  }
  section.title .meta .label {
    display: inline-block;
    width: 92px;
    color: rgba(250,250,247,0.55);
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* lead-style "key number" slide */
  section.lead {
    text-align: left;
  }
  section.lead h1 { font-size: 38px; }
  section.lead .bignum {
    font-size: 84px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
    margin: 14px 0 6px;
  }

  /* dark closer slide */
  section.closer {
    background: linear-gradient(135deg, #1a2236 0%, #2a3650 100%);
    color: #fafaf7;
    padding: 70px 80px;
  }
  section.closer h1 { color: #fafaf7; font-size: 50px; }
  section.closer h2 { color: #ffd9e0; }
  section.closer p, section.closer li, section.closer strong { color: #fafaf7; }
  section.closer code { background: rgba(255,255,255,0.12); color: #fafaf7; }
  section.closer header, section.closer footer, section.closer::after { color: rgba(250,250,247,0.65); }
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# MongoDB + AirBnB
## Stage 3 Prototype

<div class="meta">
<div><span class="label">Course</span> CS 498 · Data Management in the Cloud</div>
<div><span class="label">Team</span> Abhinav Bachu · Hanshul Bahl · Alejandra Arias</div>
<div><span class="label">Repo</span> github.com/abachu2005/cs498-airbnb-mongodb-prototype</div>
<div><span class="label">Date</span> April 29, 2026</div>
</div>

---

# Project recap & Stage 3 scope

<div class="columns">

<div>

### Where we've been

- **Stage 1** — picked **MongoDB + InsideAirbnb** (4 cities)
- **Stage 2** — designed **4 collections, 8 indexes**, pseudocode for all 6 queries

### What Stage 3 delivers

- Loader against the **full real datasets** — no row caps
- **All 6 of 6** queries implemented and benchmarked *(min for a 3-person team is 4)*
- `explain('executionStats')` captured for every query

</div>

<div>

### Two ways to run it

```bash
# CLI evidence pipeline
npm start

# interactive demo UI
npm run web
```

<div class="stat" style="margin-top:24px">
<div class="num">+10 / +10</div>
<div class="lbl">extra-credit eligibility from queries + data coverage</div>
</div>

</div>

</div>

---

# Data model

<div class="columns">

<div>

### 4 collections

| | |
|---|---|
| `listings` | per-listing metadata |
| `calendar` | per-day availability + price |
| `reviews` | one row per review |
| `neighborhoods` | canonical names per city |

> Time-series collections (`calendar`, `reviews`) stay separate from `listings` so we never rewrite a giant array on every booking change.

</div>

<div>

### 8 indexes (carried from Stage 2 *unchanged*)

```
listings    { city, listing_id }              UNIQUE
listings    { city, neighborhood, room_type }
listings    { host_id, city }
calendar    { city, listing_id, date }
calendar    { city, date, available }
reviews     { city, listing_id, date }
reviews     { reviewer_id, listing_id, date }
neighborhoods { city, neighborhood }          UNIQUE
```

</div>

</div>

---

# Loader pipeline + data coverage

```
InsideAirbnb URL  →  fetch  →  gunzip stream  →  csv-parse  →  batched insertMany  →  build 8 indexes
```

<div class="columns-3" style="margin-top:8px">

<div class="stat">
<div class="num">63,482</div>
<div class="lbl">listings</div>
</div>

<div class="stat">
<div class="num">23.17 M</div>
<div class="lbl">calendar rows</div>
</div>

<div class="stat">
<div class="num">3.20 M</div>
<div class="lbl">reviews</div>
</div>

</div>

<div class="columns-3" style="margin-top:14px">

<div class="stat">
<div class="num">481</div>
<div class="lbl">neighborhoods</div>
</div>

<div class="stat">
<div class="num">~6.5 min</div>
<div class="lbl">total load + index build</div>
</div>

<div class="stat">
<div class="num">4 / 4</div>
<div class="lbl">cities (LA · Portland · Salem · San Diego)</div>
</div>

</div>

> **The entire InsideAirbnb dataset for all four cities — not a subset.** *(Assignment: "use of all or nearly all the data is worth 10 percentage points.")* Streaming + batched inserts keep heap flat.

---

# Q1 · Two-night search (Portland)

<span class="pill">demo</span> <span class="pill ok">IXSCAN</span> <span class="pill">112 ms</span>

**Goal.** Listings in Portland whose `calendar` is open for *both* nights of a 2-day window, ranked by `review_scores_rating`.

```javascript
{ $match:  { city, date: { $in: [d1, d2] }, available: true } }
{ $group:  { _id: "$listing_id", a: { $sum: 1 } } }
{ $match:  { a: 2 } }
{ $lookup: { from: "listings", … } }
{ $sort:   { review_scores_rating: -1 } }
```

**Real `explain('executionStats')` from the full-data run.**

| stage | metric |
|---|---|
| index used | `calendar { city, date, available }` |
| keys / docs examined | **3,012 / 3,012** |
| rows returned (pre-limit) | **1,826** |
| total time | **112 ms** over 1.6M Portland calendar rows |

---

# Q2 · Empty neighborhoods in a month

<span class="pill">demo</span> <span class="pill ok">indexed anti-join</span>

**Goal.** Per (city, month), which neighborhoods had **zero** listings available.

1. `$match` calendar by city + date range + `available:true` → `$group` by `listing_id`
2. `$lookup` listings → project `neighborhood` → `$group` distinct → **active set**
3. App-side **anti-join** vs full `neighborhoods` collection for that city

**Result excerpt** *(out/q2_results.json)*

> **2 of 95** Portland neighborhoods were *dark* in 2026-06.

**Indexes hit.** `calendar { city, date, available }` · `listings { city, listing_id }` · `neighborhoods { city, neighborhood }`

> Anti-join in app code (set difference) — the active set is small enough to diff in-process; a `$lookup`-based set difference would scan the full nbhd collection per active row.

---

# Q3 · Salem entire-home windows

<span class="pill">demo</span> <span class="pill warn">app-side scanner</span> <span class="pill">min-nights aware</span>

**Goal.** For each Salem entire-home listing, find every contiguous bookable window in a given month, **respecting per-day `minimum_nights`**.

1. **One** indexed `find` for candidate Salem entire-home listings *(uses `listings { city, neighborhood, room_type }`)*
2. **One** sorted `find` over `calendar { city, listing_id, date }` for the month
3. App-side: walk consecutive `available:true` runs; keep day *d* only if **remaining-run-length ≥ `minimum_nights[d]`**

**Sample card** — `Listing #234567 → 2025-12-04 → 2025-12-09  ·  5 nights  ·  min 2`

> Why app-side? A listing might say *available* on Saturday but require a 7-night minimum. If only Sat–Sun are open you can't actually book it. Mongo can't express this in aggregation alone.

---

# Q4 · Portland trend, March → August

<span class="pill">demo</span> <span class="pill ok">reuses Q3</span>

**Goal.** Total bookable nights per month for Portland entire-home listings, Mar → Aug.
**Implementation.** Q3's interval scanner in a 6-iteration loop.

```
Mar  ████████████████████████████████  50,547
Apr  ███████████████████████████████   48,455
May  ████████████████████████████████  50,928
Jun  ████████████████████████████      43,364
Jul  █████████████████████████████     45,930
Aug  █████████████████████████████     46,143
```

> Deliberately **not** one giant aggregation. Each month is one indexed scan + the same scanner. Easy to add more months or filter by neighborhood.

---

# Q5 · December reviews per (city, year)

<span class="pill">demo</span> <span class="pill warn">COLLSCAN — by design</span> <span class="pill">1,775 ms</span>

```javascript
{ $match: { date: { $regex: /^\d{4}-12-\d{2}$/ } } }
{ $group: { _id: { city: "$city",
                   year: { $substr: ["$date", 0, 4] } },
            review_count: { $sum: 1 } } }
{ $sort:  { city: 1, year: 1 } }
```

| metric | value |
|---|---|
| reviews scanned | **3,200,722** |
| December matches | **193,340** |
| (city, year) groups returned | **62** |
| total time | **1,775 ms** |

> **Date-as-string paid off.** December extraction is a regex + `$substr`, no `$toDate` cost. If reviews grew to 100M+, add `reviews { date: 1 }`.

---

# Q6 · Re-book reminder + same-host listings

<span class="pill">demo</span> <span class="pill">touches all 4 collections</span>

**Goal.** For repeat (reviewer, listing) pairs: was the listing available in the same month as their previous review? What other listings does that host have in the same city?

1. Aggregate `reviews` → repeat (city, listing, reviewer) groups
2. **Per group:** `findOne` listing details · `findOne` calendar (`available:true`) · `find` other host listings
3. Emit enriched record

> **No new indexes needed** for any of the 6 queries — every per-record read in step 2 lands on an index already designed in Stage 2 for some other query. Strong signal the index design generalises.

> One aggregation + a few indexed point reads beats a single deeply-nested `$lookup` for both clarity *and* memory.

---

# Critique — what we'd change

### 1. `host_id_1_city_1` — wrong key order
Should be `{ city, host_id }` so it shares a `city` prefix with our other three `listings` indexes. Affects Q6's same-host lookup.

### 2. Date-as-string call was right — but for the **wrong reason**
Stage 2 justified it on storage. The actual win was **query simplicity** (Q5's regex + `$substr`). Update the rationale.

### 3. Embed neighborhoods inside city documents
Eliminates the `$lookup` in Q2 entirely. Per-city array of canonical names is a few hundred bytes.

> What we **did** change between Stage 2 and Stage 3: **nothing** in the schema or indexes. Stage 3 is a true validation of Stage 2, not a redesign.

---

# Lessons learned

<div class="columns">

<div>

### About MongoDB

- `mongodb-memory-server` shrinks the design loop from minutes to seconds — make it the default for prototyping
- `explain('executionStats')` is the **single most valuable** design-validation tool — commit its output alongside query code
- Schema design happens at **index-design** time, not collection-design time

</div>

<div>

### About cloud data systems generally

- Multi-step orchestration in app code beats nested `$lookup` for clarity *and* memory (Q3, Q4, Q6)
- "Use the planner" — pseudocode is guessing, `explain` is proof
- Ship the loader and the queries together; the schema isn't real until something has actually loaded into it

</div>

</div>

---

<!-- _class: closer -->
<!-- _footer: '' -->

# Thank you

<div class="columns" style="margin-top:30px">

<div>

### Repo
<code style="font-size:18px">github.com/abachu2005/cs498-airbnb-mongodb-prototype</code>

### Run it
```bash
cd stage3-prototype
npm install
npm start          # CLI evidence pipeline
npm run web        # interactive demo UI
```

</div>

<div>

### Evidence in `out/`
- `load_evidence.txt`
- `q1_results.json` … `q6_results.json`
- `explain_q1.json` … `explain_q6.json`
- `summary.json`

### Companion docs
- `STAGE_3_Report_MongoDB_Airbnb.pdf`
- `STAGE_3_Code.pdf`

</div>

</div>

## Questions?
