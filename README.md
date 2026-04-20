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
| `stage3-prototype/` | **Stage 3** working prototype + Stage 3 report + slide outline |

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

This boots an in-process MongoDB via `mongodb-memory-server`, loads ~14k records across the four cities, creates all eight indexes, runs Q1/Q5/Q6, and writes results + `explain('executionStats')` to `stage3-prototype/out/`. Total runtime: under 10 seconds on a laptop.

Outputs:

- `out/load_evidence.txt` - collection counts, sample documents, index list
- `out/q1_results.json`, `out/q5_results.json`, `out/q6_results.json`
- `out/explain_q1.json`, `out/explain_q5.json`, `out/explain_q6.json` - full execution plans

## Build the PDFs

The Stage 3 report and slide outline are written in Markdown and rendered to PDF via `md-to-pdf`:

```bash
cd stage3-prototype
node scripts/f.js
```

This produces `STAGE_3_Report_MongoDB_Airbnb.pdf` and `SLIDE_OUTLINE.pdf` in `stage3-prototype/`.
