# Teammate Role Sections – Stage 3 Report

The Stage 3 report is **individual** – each of the three of us submits our own
copy of `STAGE_3_Report_MongoDB_Airbnb.tex` (or PDF), but only **Section 6
"My Role in the Project"** changes between copies. The other five sections plus
the references are shared verbatim (everything in `stage3-prototype/STAGE_3_Report_MongoDB_Airbnb.tex`).

To produce your own report:

1. Copy `stage3-prototype/STAGE_3_Report_MongoDB_Airbnb.tex` from the repo.
2. Replace **only Section 6 "My Role in the Project"** (the paragraph that starts
   with "I led infrastructure, data ingestion, and demo UI...") with the LaTeX
   block below that matches your name.
3. Recompile with `tectonic STAGE_3_Report_MongoDB_Airbnb.tex` (or paste the
   text into Overleaf / your favorite LaTeX editor).
4. Submit the PDF.

The three roles below were divided based on what each of us actually owned in
the prototype. We implemented all 6 queries (the assignment minimum for a
3-person team is 4 of 6, so this earns the +10 extra-credit) and loaded the
**full** InsideAirbnb datasets for all 4 cities (worth 10 percentage points per
the rubric). Adjust wording so it sounds like your voice, but keep the *owned
files* and *owned decisions* roughly as described so the three reports stay
consistent.

---

## For Hanshul Bahl – Query Development & Performance Analysis Lead

```latex
\section{My Role in the Project}

I led query development and performance analysis for the prototype. I implemented
four of the six production queries: Q3 (Salem entire-home availability windows)
in \texttt{src/h.js}, where I designed the application-side interval scanner that
walks each listing's calendar and excludes ``available'' days that aren't
actually bookable because the remaining run is shorter than that day's
\texttt{minimum\_nights}; Q4 (Portland March--August booking trend) in
\texttt{src/i.js}, which composes Q3's scanner across the six target months and
sums total bookable nights per month; Q5 (December reviews per city per year) in
\texttt{src/c.js}, where I chose the regex + \texttt{\$substr} extraction
approach over a true \texttt{Date} type so that the year/month split stays
trivial and prefix-indexable; and Q6 (re-book reminder + same-host listings)
in \texttt{src/d.js}, where I designed the multi-step orchestration that
decomposes the query into one \texttt{reviews} aggregation followed by a small
batch of indexed point reads against \texttt{calendar} and \texttt{listings}
rather than a single deeply-nested \texttt{\$lookup} pipeline. I also owned the
\texttt{explain('executionStats')} analysis for all six queries: I read every
\texttt{out/explain\_q*.json} file the driver produced, verified that each
query stage actually hit the index Stage~2 promised it would, and confirmed the
biggest claim in our Section~3---that no query needed a new index beyond the
eight Stage~2 already specified. The biggest finding I contributed was spotting
the \texttt{host\_id\_1\_city\_1} key-order issue that Section~4 critiques: when
I traced Q6's same-host lookup through \texttt{explain}, it became clear that
reversing the key order to \texttt{\{city, host\_id\}} would make this index
share a \texttt{city} prefix with the other listings indexes and be more
consistent with the rest of the design. I worked closely with my teammates: my
queries plug into the driver Abhinav wrote and the demo UI he built, and they
all run against the schema and indexes Alejandra documented.
```

---

## For Alejandra Arias – Schema Custody, Documentation & Presentation Lead

```latex
\section{My Role in the Project}

I owned the bridge from Stage~2 design to Stage~3 prototype, plus all written
deliverables and Q2. On the design side, I was the schema custodian: I made
sure the four collections, the field shapes, and all eight compound indexes
from Stage~2~\S2.2 were carried into the prototype \emph{unchanged}, so that
Stage~3 is a true validation of the Stage~2 design rather than a redesign in
disguise. That meant reviewing the loader output
(\texttt{out/load\_evidence.txt}) every time it changed: confirming that sample
\texttt{listings} documents still matched the shape we proposed, that the
\texttt{neighborhoods} unique constraint held across all four cities under the
full-data load, and that all eight indexes built successfully in every run. On
the query side I implemented Q2 (empty neighborhoods in a given month) in
\texttt{src/g.js}, where I had to think carefully about the anti-join: the
``positive'' aggregation over \texttt{calendar} returns active neighborhoods,
and the answer is the set complement against the full \texttt{neighborhoods}
collection. I chose to compute the diff in application code rather than via a
\texttt{\$lookup} with \texttt{\$expr} because the active set is small and the
diff is trivially fast. On the documentation side, I wrote the Stage~3 report
itself (\texttt{STAGE\_3\_Report\_MongoDB\_Airbnb.tex})---this entire document,
in LaTeX, in the same visual style as our Stage~1 and Stage~2 reports---and the
slide-by-slide presentation outline (\texttt{SLIDE\_OUTLINE.md}), where I
mapped the report's six sections onto the 12-slide talk and wrote speaker notes
for each slide. The Critique section in particular (Section~4) is mine: I
cross-referenced our Stage~2 design rationale against the actual \texttt{explain}
output Hanshul produced and turned the gap between ``what we said we'd do'' and
``what the planner actually did'' into the three explicit changes we'd make in a
Stage~4. Working with my teammates was straightforward: Abhinav's loader and
demo UI gave me a fixed point to test the schema against, and Hanshul's
per-query analysis gave me concrete numbers to put into Section~3 instead of
design-time guesses.
```

---

## Quick reference – who owns what (for talking-point consistency)

| Area                                            | Owner      | Evidence in repo                                           |
| ----------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `src/a.js` loader, `src/e.js` driver, Q1 (`src/b.js`), `web/` UI | Abhinav    | `out/load_evidence.txt`, `out/q1_results.json`, `web/server.js` |
| Q3 (`src/h.js`), Q4 (`src/i.js`), Q5 (`src/c.js`), Q6 (`src/d.js`), explain plans | Hanshul    | `out/q3_results.json`, `out/q4_results.json`, `out/q5_results.json`, `out/q6_results.json`, `out/explain_q*.json` |
| Q2 (`src/g.js`), schema/index custody, report, slide outline | Alejandra  | `out/q2_results.json`, `STAGE_3_Report_MongoDB_Airbnb.tex`, `SLIDE_OUTLINE.md` |
| GitHub repo, README, PDF build                  | Abhinav    | `README.md`, `scripts/f.js`                                |

If a teammate wants to phrase things differently that's fine – just keep the
*owned files* column accurate so the three reports don't contradict each other.
