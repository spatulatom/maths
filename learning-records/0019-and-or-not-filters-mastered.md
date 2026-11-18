# AND/OR/NOT filters mastered

Lesson 0017 quiz scored 8/8. The learner can predict which rows a filter keeps. AND narrows, OR widens, and NOT flips a condition. They know how Power BI combines slicers: ticks inside one slicer are OR, separate slicers are AND.

The questions covered:

- OR keeps at least as many rows as AND
- Region = North AND Region = South returns no rows
- two ticks in one slicer = OR
- two different slicers = AND (North and Tea)
- NOT (North OR South) = not North AND not South (De Morgan's rule)
- brackets: (North OR South) AND Amount > 100 = big orders from either region
- NOT (Returned = Yes) keeps the No rows and the blank rows
- spaced review: an inner join keeps only keys found in both tables

**Evidence**: user reported "lesson 17 quize: 8/8", 2026-11-18. Score only.

**Implications**: Only lesson 0018 (cardinality and relationships) and the 0019 wrap-up remain. Slicer logic (OR inside, AND across) links directly to how relationships pass filters between tables in 0018. Condition, AND/OR/NOT, De Morgan's rule and Boolean are now in the glossary.
