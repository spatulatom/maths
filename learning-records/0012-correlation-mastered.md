# Correlation vs causation mastered

Lesson 0010 quiz scored 8/8. The questions covered:

- strength is |r|, so −0.90 is the strongest of the options
- reading a strong negative r (price vs units sold)
- spotting a confounder (ice cream and sunburn)
- r misses a U-shape
- reverse cause (firefighters and fire damage)
- `=CORREL(A2:A13,B2:B13)`
- the "look at the scatter plot first" habit
- spaced review on the lower fence

**Evidence**: user reported "quiz from lesson nr 10: 8/8", 2026-11-13. Score only.

**Implications**: Stage 6 is half done. Scatter plot, correlation (r), causation, confounder, reverse cause and spurious correlation are now in the glossary. Next is 0011: trend lines, slope, intercept, prediction vs extrapolation, and r², which closes stage 6.

In chat (2026-11-12) the user asked where people learn these concepts if not in a data analysis degree. The answer: school maths, the intro stats course in other degrees, newer business analytics degrees, certificates, and learning on the job.

## Update 2026-11-16: retake after the lesson rewrite, 9/9

The user revised 0010 and found the jump from one column to two unclear. The lesson was rewritten around paired data (one row = one pair = one dot, the shuffle problem, a list of pairs rather than two sets). It also gained "Which column is the cause?", a temperature/energy U-shape example and a new quiz question, "Which way?" (umbrellas vs rainfall, with a right-answer-wrong-reason option).

**Evidence**: user reported "Quiz 0010-correlation: 9/9 correct", 2026-11-16. Questions asked while revising:
- whether maths thinks in columns or in sets
- how to tell which column is the cause
- what "the plot" means
- whether a U-shape plot shows "only 2 values"
- whether part of a column counts as an Excel range
- whether r = 0.85 guarantees a strong pattern. Answered with a cloud plus one far point (r −0.02 → 0.87) and Anscombe's quartet.

**Implications**: The correlation idea now rests on pairs, not just on the r number. Watch out for "range" (an Excel block of cells vs max − min) and for "scatter plot" read as "scattered points".
