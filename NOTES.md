# Notes

## User preferences
- Wants no deep weeds: "enough to not be caught off guard".
- Left lesson design fully to the teacher ("I will leave it to you").
- Practises daily: about 1 hr on most days, several hours on some. Make lessons ~15–30 min, with optional "extra practice" for long days.
- Global formatting rules (CLAUDE.md): short paragraphs, real headers, blank lines. Apply the same readability to lessons.
- Wants technical words explained in plain language (asked about "outliers" etc. in lesson 0002). Every lesson from 0003 on gets a short "New words" box near the top.
- DAX is new to the user (LR 0004). Show DAX only as a labelled "preview", always translated into plain words or the Excel equivalent. No DAX exercises; the Coursera course teaches it.
- Sometimes studies on the phone ("on the go"). Local HTML can't open there, so publish lessons as private Artifacts via `node tools/bundle.mjs <lesson> <scratchpad out>`. Keep lessons phone-friendly.
  - 0003: https://claude.ai/artifact/MAgtRooLbeG1j9hYWQRVv2
  - 0004: https://claude.ai/artifact/BLhBXxtgaWM2m7d1P6yM4n
- Language: English (no answer on Polish terms yet; offer once lessons start if useful).

## Working notes
- PL-300 study guide (skills as of 2026-04-20), math-relevant bullets to tie lessons to: "Evaluate data, including data statistics" (profiling), "Group and aggregate rows", "Use basic statistical functions", "Implement time intelligence measures", "Create semi-additive measures", "Use grouping, binning, and clustering", "Use reference lines, error bars, and forecasting", "Detect outliers and anomalies". No M-code writing, Python, R, or SQL in the skills list.
- Practice tool: Excel first (matches Coursera course 1), with optional JS/Python equivalents since the user knows JS.
- Diagnostic done (LR 0002). 0002 median: 8/8 (LR 0003). 0003 weighted averages written. Then stage 4 growth over time (MoM/YoY, running totals).
- Could later offer a short lesson on the mode (user may ask) and on Simpson's paradox (a natural follow-on to weighted means, using weightmix.js).
- Each lesson ends with 1–2 spaced review questions from earlier lessons.
- Glossary lives at reference/glossary.html. Add terms only after quiz evidence. Pending: median (after 0002 results).
- User asked how far is "far enough" for an outlier. Previewed the 1.5×IQR fence rule in chat (2026-10-27); teach it properly in stage 5 (quartiles/box plots) and refer back to this question.
- User questioned the word "mean" (unkind/intend). Explained its root is Latin medianus ("middle"). Keep using "mean" but always pair it with "(the everyday average)" until it feels natural.
- Components: assets/style.css, quiz.js/.css (Not-sure button, copyable results), datastrip.js/.css (dot plot with mean/median, editable), weightmix.js/.css (groups with counts & means → naive vs weighted mean), .newwords callout in style.css.
