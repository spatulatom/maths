# Cardinality and relationships mastered

Lesson 0018 quiz scored 8/8. The learner can read a data model: which table is the "one" side, fact vs dimension tables, and how a star schema passes a slicer's filter from a dimension to the fact table. They can also spot duplicate keys from their symptoms: more rows and higher totals after a merge.

The questions covered:

- Customers → Orders: Customers is the "one" side
- one row per sale = fact table
- total sales went up after a merge = duplicate keys in Products
- 1,000 rows became 1,040 after a left outer merge = some keys matched more than once
- a Tea slicer on Products narrows the Sales visuals to Tea sales
- number of customers who ordered = count distinct CustomerIDs, not count rows
- star schema = fact in the middle, dimensions around it
- spaced review: two ticks in one slicer = OR

**Evidence**: user reported "lesson 18 quize: 8/8", 2026-11-18. Score only.

**Implications**: The duplicate-key gap noted after 0016 (LR 0018) is closed: two questions here tested it and both were right. Every lesson from 0002 to 0018 is now at 8/8 or full marks. Only the 0019 wrap-up remains (14-question mixed quiz plus checklist). Cardinality, unique key, fact table, dimension table, star schema and count distinct are now in the glossary.
