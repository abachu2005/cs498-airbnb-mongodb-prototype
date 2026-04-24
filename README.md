# CS 498 Stage 3 — MongoDB + InsideAirbnb prototype

Working prototype, individual report, slide deck, and commented code listing
for the CS 498 Stage 3 deliverable.

Team: Abhinav Bachu, Hanshul Bahl, Alejandra Arias.

The submission lives in [`stage3-prototype/`](./stage3-prototype/).

## Submitted artifacts

| Path | Deliverable |
|------|-------------|
| `stage3-prototype/STAGE_3_Report_MongoDB_Airbnb.pdf` | Individual 2-page report (3rd page = references) |
| `stage3-prototype/STAGE_3_SLIDES.pdf` | 12-slide presentation deck |
| `stage3-prototype/STAGE_3_Code.pdf` | Every source file in one paginated PDF |
| `stage3-prototype/SLIDE_OUTLINE.pdf` | Speaker outline for the slide deck |
| `stage3-prototype/src/`, `web/`, `scripts/` | Prototype source code |
| `stage3-prototype/out/` | Query results + `explain('executionStats')` evidence |
| `stage3-prototype/slides/` | HTML source for the slide deck and demo screenshots |

## Run the prototype

Requirements: Node 18+, network access (the loader fetches CSVs from
`data.insideairbnb.com`).

```bash
cd stage3-prototype
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

## Rebuild the PDFs

```bash
cd stage3-prototype
npm run build:pdfs       # report (LaTeX -> tectonic) + slide outline
npm run build:codepdf    # paginated source-code PDF
npm run build:slides     # 12-slide HTML -> PNG -> PDF deck
```

The report build requires `tectonic` (`brew install tectonic`).
