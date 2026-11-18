# Sets and joins mastered

Lesson 0016 quiz scored 8/8. The learner can name the set operation behind a question (intersection, union, difference) and pick the matching Power Query step. They know a merge puts tables side by side by key, while append stacks tables with the same columns.

The questions covered:

- customers who ordered in both months = intersection
- a left outer join onto a table with unique keys keeps the row count (500 → 500)
- orders with no matching customer = left anti join
- switching left outer → inner drops unmatched orders, so totals fall
- same columns, all rows = append, not merge
- right anti (Orders left, Customers right) = customers who never ordered
- null after a left outer join = no matching key on the right
- spaced review: p = 0.40 means no difference shown yet, not "identical"

**Evidence**: user reported "lesson 16 quize: 8/8", 2026-11-18. Score only.

**Implications**: Stage 8 (data modelling) has started well. Lesson 0017 (AND/OR/NOT filters) reuses the same set logic for filtering rows. Lesson 0018 (cardinality) builds on "unique keys keep the row count". The quiz had no question on duplicate keys double-counting, so watch for that in 0018. Set operations, key, merge, append and null are now in the glossary.
