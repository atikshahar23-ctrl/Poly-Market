---
name: Polymarket filterResolved quirks
description: Why end_date_iso is not a reliable filter; current filter approach for live/active-only markets
---

## The problem
Polymarket's CLOB API returns all markets including old unresolved ones. Three things to filter:
1. **Probability extremes** — markets where `yesPrice >= 0.95 || yesPrice <= 0.05` (resolved or near-resolved)
2. **Inactive flag** — markets where `active === false` (explicitly marked closed)
3. **End date** — `end_date_iso` looks useful but ALL markets return past dates, making it unusable as a filter without causing 0 results

## Current filter (in polymarket.ts)
```typescript
if (filterResolved && (yesPrice <= 0.05 || yesPrice >= 0.95)) continue;
if (filterResolved && market["active"] === false) continue;
```

## Remaining gap
Some old 2023 markets (NBA games, UFC events) remain because Polymarket never set `active: false` and their prices stuck at ~50%. These cannot be filtered without external knowledge (actual game results). Acceptable tradeoff.

**Why:** The end_date filter was added and immediately removed — it caused 0 results because all 6000 pages of API data have past end dates.
