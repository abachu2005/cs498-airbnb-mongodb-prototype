# Compiling `aspirin_report.tex`

This folder contains a self-contained LaTeX report. It uses only the
images in `images/` (your hand-drawn figures) and standard packages
(`graphicx`, `geometry`, `caption`, `enumitem`, `hyperref`, `titlesec`,
`microtype`, `parskip`, `xcolor`).

## Easiest: Overleaf (no install)

1. Go to <https://www.overleaf.com/> and start a **New Project → Upload Project**.
2. Zip up this folder (`aspirin_report.tex` + the `images/` folder) and upload the zip.
3. Set the main document to `aspirin_report.tex`. Hit **Recompile**.

That's it. Overleaf already has every package the file uses.

## Locally (if you install MacTeX/BasicTeX)

```bash
brew install --cask basictex
eval "$(/usr/libexec/path_helper)"
sudo tlmgr update --self
sudo tlmgr install titlesec microtype enumitem parskip hyperref

cd "chemistry report"
pdflatex aspirin_report.tex
pdflatex aspirin_report.tex   # second pass for cross-refs
```

The output will be `aspirin_report.pdf` in the same folder.

## Notes

- Image filenames were renamed from the original `Screenshot 2026-04-20 at 3.42.27 PM.png`
  (which contains a non-breaking-space character that breaks
  command-line tools and `\includegraphics`) to `img1.png` ... `img10.png`.
  Mapping (left = new, right = original timestamp):
  - `img1.png`  ← 3:42:27 PM (full structure with formula)
  - `img2.png`  ← 3:42:33 PM (functional groups labeled)
  - `img3.png`  ← 3:42:40 PM (overall synthesis reaction)
  - `img4.png`  ← 3:42:47 PM (synthesis mech step 1: anhydride activation)
  - `img5.png`  ← 3:42:55 PM (synthesis mech step 2: nucleophilic addition)
  - `img6.png`  ← 3:43:05 PM (synthesis mech step 3: collapse + acetate loss)
  - `img7.png`  ← 3:43:17 PM (base hydrolysis of aspirin) — *not currently used; available if you want to add it as the selected reaction in C instead of EAS*
  - `img8.png`  ← 3:43:22 PM (EAS directing analysis, EWG/EDG)
  - `img9.png`  ← 3:43:27 PM (acid-base reaction with hydroxide) — *not currently used; you can fold it into the carboxylic-acid bullet in C if you want*
  - `img10.png` ← 3:43:37 PM (EAS full mechanism via σ-complex)
- Every figure caption uses the `CHEM 332_Scheme N` label format the
  rubric requires.
- Target length is 4–5 typeset pages plus references and reflection,
  which keeps it inside the 3–5 page band the instructions specify
  (the example PDF was 7 pages and was flagged for that).
