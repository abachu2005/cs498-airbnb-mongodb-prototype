Stage 3 Presentation - Slide-by-Slide Outline
Abhinav Bachu, Hanshul Bahl, Alejandra Arias
CS 498 / Data Management in the Cloud
10-minute talk, ~10 slides

This document tells you exactly what to put on each slide and what to say while it is up. The four required content points from the assignment (data model overview, 2+ query demos, critique, lessons learned) are spread across slides 3, 5-7, 8, and 9 respectively. Total target speaking time: 9-10 minutes; ~1 min per slide except for the demo slides which run a bit longer.

---

## Slide 1 - Title

**On the slide:**
- Title: "MongoDB + AirBnB - Stage 3 Prototype"
- Course: CS 498 / Data Management in the Cloud
- Team: Abhinav Bachu, Hanshul Bahl, Alejandra Arias
- Date

**Speaker notes (~30 sec):** Quick intro. "We're going to walk through the prototype we built on top of our Stage 2 design - a working MongoDB + AirBnB system that loads real InsideAirbnb data for four cities and runs three of the six queries from the question document end-to-end."

---

## Slide 2 - Project Recap and Stage 3 Scope

**On the slide:**
- One-line summary of Stage 1 (system + dataset selection: MongoDB + InsideAirbnb 4 cities)
- One-line summary of Stage 2 (4 collections, 8 indexes, pseudocode for all 6 queries)
- Stage 3 scope (what's on the slide should be 3 short bullets):
  - Working loader against real data
  - 3 of 6 queries implemented and benchmarked
  - `explain('executionStats')` captured for every query
- "Everything runs with one command: `npm start`"

**Speaker notes (~45 sec):** Frame the work. "Stage 1 picked the system and dataset. Stage 2 was design on paper. Stage 3 is the prototype - actually loading data, actually running queries, and proving the indexes we designed are the indexes the planner uses."

---

## Slide 3 - Data Model Overview

**On the slide:**
- Diagram or table of the 4 collections:
  - `listings` (per-listing metadata)
  - `calendar` (per-day availability/pricing)
  - `reviews` (per-review records)
  - `neighborhoods` (canonical neighborhood names)
- Index list (small font, 8 entries):
  - `listings { city, listing_id }` unique
  - `listings { city, neighborhood, room_type }`
  - `listings { host_id, city }`
  - `calendar { city, listing_id, date }`
  - `calendar { city, date, available }`
  - `reviews { city, listing_id, date }`
  - `reviews { reviewer_id, listing_id, date }`
  - `neighborhoods { city, neighborhood }` unique
- Caption: "All 8 indexes carried over from Stage 2 unchanged."

**Speaker notes (~1 min):** Walk the audience through the data model in 3 sentences. "Four collections, each one maps to one source CSV file from InsideAirbnb. The high-volume time-series collections - calendar and reviews - stay separate from listings so we don't have giant array rewrites on every booking change. Indexes are tuned per query."

---

## Slide 4 - Loader Pipeline

**On the slide:**
- Simple horizontal flow diagram:
  - InsideAirbnb URLs -> fetch -> gunzip stream -> csv-parse -> clean/coerce -> bulk insert -> create indexes
- Counts loaded in the recorded run (table):
  - listings: 1,780
  - reviews: 4,000
  - neighborhoods: 411
  - calendar: 8,000
- "Runs end-to-end in <10 seconds via `mongodb-memory-server`"

**Speaker notes (~45 sec):** "We stream the gzipped CSVs from InsideAirbnb directly through gunzip and csv-parse so we never hold a full file in memory. The loader caps at a few hundred listings per city so the whole pipeline runs in seconds and we can iterate on queries fast. The same code would run unmodified against a real Atlas cluster - we just swap the URI."

---

## Slide 5 - Demo: Query 1 (Portland 2-day Search)

**On the slide:**
- Query name and goal: "Listings available on both days of a requested 2-day window in Portland, sorted by rating"
- The pipeline (small code block, abbreviated):
  ```javascript
  $match { city, date IN [d1,d2], available }
  $group by listing_id, count = 2
  $lookup listings -> $sort review_scores_rating
  ```
- Sample result row from the recorded run:
  - "Beautiful Apt near City Center!" - Irvington - rating 4.94
- Execution stats from `explain()`:
  - **IXSCAN on `city_1_date_1_available_1`**
  - 6 keys examined, 6 docs examined, 3 returned, **3 ms total**

**Speaker notes (~1 min):** Show the query, then show that it actually hits the index. "We pick the demo dates dynamically from the loaded data so this always returns something live. The execution plan confirms we get a clean index scan - 6 keys for 3 results. No collection scan, no sort spill."

---

## Slide 6 - Demo: Query 5 (December Reviews per City per Year)

**On the slide:**
- Query name and goal: "Count December reviews grouped by city and year"
- The pipeline (small code block):
  ```javascript
  $match date matches "____-12-__"
  $group by { city, year: $substr(date,0,4) }, sum
  $sort city, year
  ```
- Sample result rows (3-4 rows):
  - los_angeles 2023 -> N reviews
  - los_angeles 2024 -> N reviews
  - portland 2023 -> N reviews
  - san_diego 2024 -> N reviews
- Execution note: "Full-collection aggregation by design - 4,000 rows in 2 ms. If reviews grew to 10M+, add `reviews { date: 1 }`."

**Speaker notes (~1 min):** Highlight the date-as-string design choice paying off. "We stored dates as strings. That means December extraction is a one-character substring match on a regex - no `$toDate` cost. Stage 2 reasoned about this in terms of storage, but the bigger win turned out to be query simplicity."

---

## Slide 7 - Demo: Query 6 (Re-book Reminder + Same-Host Listings)

**On the slide:**
- Query name and goal: "For repeat reviewer-listing pairs, was the listing available in the same month as their previous review? What other listings does that host have in the same city?"
- Multi-step diagram (3 boxes):
  1. Aggregate `reviews` -> repeat (city, listing, reviewer) groups
  2. For each: `findOne` calendar (available?) + `findOne` listing details + `find` other host listings
  3. Emit enriched record
- Sample output excerpt (1 record, 3-4 fields shown):
  - listing_name, host_name, month, available_in_same_month, other_host_listings_same_city
- "All step-2 reads hit indexes designed in Stage 2 - no new indexes needed."

**Speaker notes (~1.5 min):** This is the most interesting query because it touches all 4 collections. "We could have forced this into a single aggregation with nested $lookups, but breaking it into one aggregate plus a few indexed point reads per group is much easier to read and debug. Importantly, every per-record read in step 2 lands on an index we already designed for some other query in Stage 2 - that's a strong signal the index design generalizes."

---

## Slide 8 - Critique: What We'd Change

**On the slide:** (3 bullets)
- **Date-as-string call was right** but for query simplicity, not storage. Update the design rationale.
- **`host_id_1_city_1` index has wrong key order** - should be `{ city, host_id }` so it shares a `city` prefix with our other 3 listings indexes.
- **Neighborhoods could be embedded** as a per-city array if we did Q2 frequently - eliminates the join entirely.

**Speaker notes (~1 min):** Be honest about what we'd redo. "These are all small adjustments. The core 4-collection / 8-index design held up well under actual implementation. The biggest lesson is that we should have spent more Stage 2 time on access patterns and less on document shapes."

---

## Slide 9 - Lessons Learned + Advice

**On the slide:** (4 short bullets)
- `mongodb-memory-server` shrinks the design loop from minutes to seconds - use it from day 1
- `explain('executionStats')` is the single most valuable tool for design validation
- Multi-step orchestration in app code beats nested `$lookup` for clarity (Q6)
- Schema design happens at index-design time, not collection-design time

**Speaker notes (~1 min):** Two big takeaways. "First, don't start a Mongo project by setting up Atlas. `mongodb-memory-server` gives you a real Mongo with zero setup. Second, always commit `explain` output alongside your query code. Pseudocode in our Stage 2 was guessing about index usage; one line of `.explain()` per query in Stage 3 turned guessing into proof."

---

## Slide 10 - Wrap and Q&A

**On the slide:**
- "Repo: github.com/<user>/cs498-airbnb-mongodb-prototype"
- "Run it: `cd stage3-prototype && npm install && npm start`"
- "Evidence: `out/load_evidence.txt`, `out/q*_results.json`, `out/explain_q*.json`"
- "Questions?"

**Speaker notes (~30 sec):** Tell them where the code, evidence, and report live. Open the floor.

---

## Two slides to add for the *final* slides PDF (assignment requires)

The assignment says the final slides include two extras:

**Final Slide A - All implemented queries:** copy slides 5, 6, 7 with full result tables and full explain output, not abbreviated. Same titles, larger code blocks.

**Final Slide B - Dataset load coverage:** the counts table from Slide 4, plus a sentence explaining what fraction of the full dataset that represents (e.g., "loaded ~500 listings/city out of ~30k Los Angeles + ~5k Portland + ~1k Salem + ~12k San Diego available in InsideAirbnb's 2025-12-04 snapshot").

These two are not in the 10-minute presentation deck; they only go into the *final* slides PDF that gets uploaded by 6 May.
