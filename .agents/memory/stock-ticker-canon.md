---
name: Stock ticker canonical form
description: Class-share tickers must use the dash form (BRK-B) as the join key across the stock feed and the influencer feed, or fusion/price-lookup silently drops them.
---

# Stock ticker canonical form

The Yahoo-style **dash** form (e.g. `BRK-B`) is the canonical ticker used by the
stock quote feed (`stocks.ts`), stock recommendations, and `openStockPosition`.
TradingView symbols use the **dot** form (`BRK.B`) — that's display-only.

**Rule:** any new source that emits tickers to be joined against stock quotes
(e.g. the influencer feed in `influencers.ts`) must emit the dash form. The
Smart-Money fusion in `autotrader-engine.tsx` and the one-tap trade in
`smart-money.tsx` key on the raw ticker (uppercased), so `BRK.B` vs `BRK-B`
silently fails to merge and can't resolve a live price.

**Why:** discovered after the influencer map used `BRK.B` while the stock feed
used `BRK-B` — Berkshire signals never fused with technicals and one-tap trades
errored "no live price."

**How to apply:** when adding influencers/tickers, use the symbol exactly as it
appears in `stocks.ts` (dash form). Don't introduce a runtime normalizer unless
a source you don't control forces it.
