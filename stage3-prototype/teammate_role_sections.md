# Teammate Role Sections – Stage 3 Report

The Stage 3 report is **individual** – each of the three of us submits our own
copy of `STAGE_3_Report_MongoDB_Airbnb.tex` (or PDF), but only **Section 7
"My Role in the Project"** changes between copies. The other six sections plus
the references are shared verbatim (everything in `stage3-prototype/STAGE_3_Report_MongoDB_Airbnb.tex`).

To produce your own report:

1. Copy `stage3-prototype/STAGE_3_Report_MongoDB_Airbnb.tex` from the repo.
2. Replace **only Section 7 "My Role in the Project"** (the paragraph that starts
   with "I led infrastructure and data ingestion...") with the LaTeX block below
   that matches your name.
3. Recompile with `tectonic STAGE_3_Report_MongoDB_Airbnb.tex` (or paste the
   text into Overleaf / your favorite LaTeX editor).
4. Submit the PDF.

The three roles below were divided based on what each of us actually owned in
the prototype – feel free to tweak wording so it sounds like your voice, but
the *content* (which files / which decisions you owned) should stay roughly as
described so the three reports are consistent.

---

## For Hanshul Bahl – Query Development & Performance Analysis Lead

```latex
\section{My Role in the Project}

I led query development and performance analysis for the prototype. I implemented
two of the three production queries: Q5 (December reviews per city per year) in
\texttt{src/c.js}, where I chose the regex + \texttt{\$substr} extraction
approach over a true \texttt{Date} type so that the year/month split stays
trivial and prefix-indexable; and Q6 (re-book reminder + same-host listings)
in \texttt{src/d.js}, where I designed the multi-step orchestration that
decomposes the query into one \texttt{reviews} aggregation followed by a small
batch of indexed point reads against \texttt{calendar} and \texttt{listings}
rather than a single deeply-nested \texttt{\$lookup} pipeline. I also owned the
\texttt{explain('executionStats')} analysis for all three queries: I read every
\texttt{out/explain\_q*.json} file the driver produced, verified that each
query stage actually hit the index Stage~2 promised it would, and wrote up the
plan summaries that appear in Section~4 (\texttt{IXSCAN} on
\texttt{city\_1\_date\_1\_available\_1} for Q1, full-collection aggregate for
Q5, the four indexes Q6 hits per record). The biggest finding I contributed was
spotting the \texttt{host\_id\_1\_city\_1} key-order issue that Section~5
critiques: when I traced Q6's same-host lookup through \texttt{explain}, it
became clear that reversing the key order to \texttt{\{city, host\_id\}} would
make this index share a \texttt{city} prefix with the other listings indexes
and be more consistent with the rest of the design. I worked closely with my
teammates: my queries plug into the driver Abhinav wrote, and they all run
against the schema and indexes Alejandra documented.
```

---

## For Alejandra Arias – Schema Custody, Documentation & Presentation Lead

```latex
\section{My Role in the Project}

I owned the bridge from Stage~2 design to Stage~3 prototype, plus all written
deliverables. On the design side, I was the schema custodian: I made sure the
four collections, the field shapes, and all eight compound indexes from
Stage~2~\S2.2 were carried into the prototype \emph{unchanged}, so that Stage~3
is a true validation of the Stage~2 design rather than a redesign in disguise.
That meant reviewing the loader output (\texttt{out/load\_evidence.txt}) every
time it changed: confirming that sample \texttt{listings} documents still
matched the document shape we proposed, that the \texttt{neighborhoods} unique
constraint held, and that all eight indexes built successfully in every run.
On the documentation side, I wrote the Stage~3 report itself
(\texttt{STAGE\_3\_Report\_MongoDB\_Airbnb.tex})---this entire document, in
LaTeX, in the same visual style as our Stage~1 and Stage~2 reports---and the
slide-by-slide presentation outline (\texttt{SLIDE\_OUTLINE.md}), where I
mapped the report's seven sections onto the 10-minute talk and wrote speaker
notes for each slide. The Critique section in particular (Section~5) is mine:
I cross-referenced our Stage~2 design rationale against the actual
\texttt{explain} output Hanshul produced and turned the gap between
``what we said we'd do'' and ``what the planner actually did'' into the three
explicit changes we'd make in a Stage~4. Working with my teammates was
straightforward: Abhinav's loader gave me a fixed point to test the schema
against, and Hanshul's per-query analysis gave me concrete numbers to put
into Section~4 instead of design-time guesses.
```

---

## Quick reference – who owns what (for talking-point consistency)

| Area                                            | Owner      | Evidence in repo                                           |
| ----------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `src/a.js` loader, `src/e.js` driver, Q1 (`src/b.js`) | Abhinav    | `out/load_evidence.txt`, `out/q1_results.json`             |
| Q5 (`src/c.js`), Q6 (`src/d.js`), explain plans | Hanshul    | `out/q5_results.json`, `out/q6_results.json`, `out/explain_q*.json` |
| Schema/index custody, report, slide outline     | Alejandra  | `STAGE_3_Report_MongoDB_Airbnb.tex`, `SLIDE_OUTLINE.md`    |
| GitHub repo, README, PDF build                  | Abhinav    | `README.md`, `scripts/f.js`                                |

If a teammate wants to phrase things differently that's fine – just keep the
*owned files* column accurate so the three reports don't contradict each other.
