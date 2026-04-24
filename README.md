# CS 498 Stage 3 — MongoDB + InsideAirbnb prototype

Working prototype, individual report, slide deck, and commented code listing
for the CS 498 Stage 3 deliverable.

Team: Abhinav Bachu, Hanshul Bahl, Alejandra Arias.

## Submitted artifacts

| File | Deliverable |
|------|-------------|
| `STAGE_3_SLIDES.pdf` | 12-slide presentation deck |
| `STAGE_3_Code.pdf` | Every source file in one paginated PDF |
| `STAGE_3_Report_MongoDB_Airbnb.pdf` | Individual 2-page report (3rd page = references) |

The repo itself (linked from the slide deck) is the prototype.

## Run the prototype

Requirements: Node 18+, network access (the loader fetches CSVs from
`data.insideairbnb.com`).

```bash
npm install
npm start          # full-data evidence pipeline (writes to out/)
npm run web        # interactive browser demo on localhost:4173
```

The prototype boots an in-process MongoDB via `mongodb-memory-server`, loads
the **full** InsideAirbnb dataset for all four cities (Los Angeles, Portland,
Salem, San Diego — ~63.5 K listings, ~3.2 M reviews, ~23.2 M calendar rows,
no row caps), creates the eight Stage 2 indexes, and runs **all six queries**
end-to-end with `explain('executionStats')` captured. Full-data load takes
~6.5 minutes on a laptop; for fast iteration use `npm run start:fast` or
`npm run web:fast` (capped at a few thousand rows per city, boots in ~10 s).

## Layout

```
src/        loader.js, driver.js, q1.js … q6.js   - prototype source
web/        server.js + public/{index.html, app.js, styles.css}
out/        recorded query results, explain plans, load_evidence
```
