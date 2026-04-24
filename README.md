# CS 498 Project - MongoDB + AirBnB

Three-stage class project: choose a cloud data system + dataset, design a schema and queries for it, then build a working prototype. We picked **MongoDB** + the **InsideAirbnb** dataset (Los Angeles, Portland, Salem, San Diego).

Team: Abhinav Bachu, Hanshul Bahl, Alejandra Arias.

## Repo layout

| Path | What it is |
|------|-----------|
| `example from last checkpoint/TASK_1-2.pdf` | **Stage 1** report - system + dataset selection (reference copy from a prior checkpoint) |
| `AirBnB-info-questions.pdf`, `Twitter-info-questions.pdf` | The two candidate dataset/question packs handed out by the course |
| `instructions_for_todays_assignment.rtf` | Stage 2 assignment text |
| `stage_3_instructions.rtf` | Stage 3 assignment text |
| `task3-deliverables/` | **Stage 2** design deliverables (TASK_3_Report and supporting scripts/assets) |
| `stage3-prototype/` | **Stage 3** working prototype (`src/` queries, `web/` demo UI) + Stage 3 report + slide outline |

## Stages at a glance

- **Stage 1** picked MongoDB + InsideAirbnb. See `example from last checkpoint/TASK_1-2.pdf`.
- **Stage 2** designed the schema (4 collections, 8 indexes) and pseudocode for all 6 AirBnB queries. See `task3-deliverables/TASK_3_Report_MongoDB_Airbnb.pdf`.
- **Stage 3** implements the prototype. See `stage3-prototype/STAGE_3_Report_MongoDB_Airbnb.pdf` and `stage3-prototype/SLIDE_OUTLINE.pdf`.

## Run the Stage 3 prototype

Requirements: Node 18+, network access (the loader fetches CSVs from `data.insideairbnb.com`).

```bash
cd stage3-prototype
npm install
npm start
```

This boots an in-process MongoDB via `mongodb-memory-server`, loads the **full** InsideAirbnb datasets for all four cities (no row caps — multiple millions of `calendar` rows), creates all eight indexes, runs **all 6 queries**, and writes results + `explain('executionStats')` to `stage3-prototype/out/`. Full-data runtime is several minutes on a laptop; for fast iteration use `npm run start:fast` instead, which caps each collection to a few thousand rows per city and finishes in under 10 seconds.

Outputs:

- `out/load_evidence.txt` — collection counts (per-city and total), sample documents, index list
- `out/q1_results.json` … `out/q6_results.json`
- `out/explain_q1.json` … `out/explain_q6.json` — full execution plans
- `out/summary.json` — one-line-per-query roll-up

## Run the demo UI (recommended for the presentation)

A small Express + vanilla-JS frontend lives in `stage3-prototype/web/`. It boots the same in-process Mongo, loads the same data once, and exposes **all six queries** as an interactive UI.

```bash
cd stage3-prototype
npm install        # only the first time, installs express
npm run web        # full-data load (several minutes first boot)
# or
npm run web:fast   # capped load (~10s boot) for quick demos
```

Then open <http://localhost:4173>. While the loader runs, a spinner overlay is shown; after that, every query runs against the live in-process database.

What the UI shows:

- **Q1 — Two-night search.** City picker + date range. Highest-rated listings whose `calendar` is open for both nights, as Airbnb-style cards.
- **Q2 — Empty neighborhoods.** City + month picker. Anti-joins `calendar` activity against the full neighborhoods set and shows the dark ones as badges.
- **Q3 — Salem entire-home availability windows.** City + month picker. One card per listing with explicit `from → to` bookable intervals (min-nights aware).
- **Q4 — Portland booking trend.** Bar chart of total bookable nights per month, March → August (re-runs Q3's interval logic in a loop).
- **Q5 — December reviews per city per year.** Per-city cards with a horizontal bar chart, one bar per year.
- **Q6 — Re-book reminders.** One card per repeat-reviewer / listing pair, with the host's other listings in the same city pulled in via indexed point reads.

## Build the PDFs

Three PDFs go to Canvas: the 2-page **report**, the **slide outline**, and the **code listing**. Two scripts produce all three:

```bash
cd stage3-prototype
npm run build:pdfs       # report (tex -> tectonic) + slide outline (md -> md-to-pdf)
npm run build:codepdf    # one PDF containing every src/ + web/ source file with comments
```

Outputs in `stage3-prototype/`:

- `STAGE_3_Report_MongoDB_Airbnb.pdf` — 2-page individual report (Deliverable 4)
- `SLIDE_OUTLINE.pdf` — speaker outline / notes for the slide deck (Deliverable 1/2 source material)
- `STAGE_3_Code.pdf` — every source file in one paginated, syntax-formatted PDF (Deliverable 3)

The report build requires `tectonic` (install with `brew install tectonic`). The code PDF build only needs Node.
