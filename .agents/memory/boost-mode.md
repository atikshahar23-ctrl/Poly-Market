---
name: Boost mode (bots page)
description: How the 5-minute max-cadence "Boost" mode is wired across engines and why Polymarket is excluded from churn.
---

# Boost mode

A "Boost" button on `/bots` arms every bot and switches engines into a 5-minute
max-cadence mode so many small/fast paper trades fire, with a live countdown clock.

## Design
- State lives in `AutoTraderSettings.boostUntil` (epoch ms). `BOOST_DURATION_MS = 5min`.
- Engines never permanently overwrite user thresholds. Each engine derives
  `boostActive = settings.boostUntil > Date.now()` at render and reads boost-tightened
  locals; when boost expires the values revert automatically.
- Provider has a gated auto-clear `setTimeout` that zeroes `boostUntil` at expiry; the
  bots-page countdown uses a `setInterval` gated to run only while boost is active.

## What boost changes
- Cooldowns collapse to a few seconds (`BOOST_COOLDOWN_MS = 4s`; DCA buys every 10s).
- Faster refetch/staleTime on scalp, momentum, smart-money (stock recs + influencers),
  and the poly feed.
- Smart-exit takes profit sooner, tighter giveback, shorter recycle; runners are
  disabled under boost (bank everything fast).

## Why Polymarket reopen cooldown is NOT reduced
**Why:** Polymarket positions are multi-day prediction bets, not scalps. Churning them
every few seconds is nonsensical and would just thrash same-day bets.
**How to apply:** `POLY_COOLDOWN_MS` (30min) stays fixed even in boost. Only the poly
*feed* refetch is sped up so genuinely new short-term markets surface faster.
