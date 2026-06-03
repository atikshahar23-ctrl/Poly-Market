---
name: Momentum scanner & Warrior Auto-Trader
description: Design of the momentum/meme-surge scanner and the trailing-stop + daily-guard Auto-Trader upgrade
---

# Momentum scanner

- Surge detection runs on a top-by-volume crypto universe using 5m klines and combines relative volume (RVol), short rate-of-change (15m/1h), consecutive green-candle streak, and position-in-recent-range into a 0-100 score.
- Coins are bucketed into stages SURGING / BUILDING / HOT / COOLING; entry/SL/TP are ATR-sized. Backed by a short cache + in-flight coalescing so a hung fetch can't 502 the endpoint (same pattern as scalp signals).
- Contract is OpenAPI-first: `MomentumCoin` schema + `getMomentumCoins` op; consume via the generated `useGetMomentumCoins` hook. Momentum runners are treated **LONG-only** in the auto-trader (meme moves are upside-biased and reverse hard).

# Warrior Auto-Trader

- One headless engine consumes scalp + momentum per a `strategy` setting (SCALP / MOMENTUM / BOTH), normalizes both into a common candidate shape, de-dupes by asset (highest score wins), then applies favorites / open-asset / per-asset cooldown gates before opening.
- **Trailing stop** lives in portfolio-context `updateTrailingStops(prices)` as a pure setState updater (no stateRef return contract needed — it's fire-and-forget). It tracks a favorable `peak` per position and only ever *tightens* the stop: LONG uses max(peak)/raise SL, SHORT uses min(peak)/lower SL. It arms only after price moves past `activatePct` from entry. Must run **before** `checkSlTp` in the price effect so a freshly tightened stop can trigger the same tick.
  - **Why:** loosening a stop would defeat risk control; the monotonic guard is the core invariant — preserve it in any refactor.
- **Daily loss circuit-breaker** sums realized PnL from `tradeHistory` closed since local midnight; halts *opening new* trades (existing positions keep their exits) once loss <= -(dailyMaxLossPct% × totalDeposited). It is portfolio-wide (all realized trades), not auto-only — intentional default.
- New autotrader-context settings backfill safely because `loadSettings` spreads DEFAULT_SETTINGS over stored JSON.
