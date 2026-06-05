---
name: Master mastery + briefing educational framing
description: Two durable decisions — how the master "control level" affects trading, and how the briefing page resolves the advice-vs-education constraint.
---

# Master "control level" (mastery)

The alpha coordinator carries an earned `masteryScore` (0-100) derived from a rolling win-rate over the master's recent **auto** trades, damped by sample size (full weight ~15 trades).

**Rule:** mastery only ever *eases* selectivity on trades ALIGNED with the fleet direction, and the easing is hard-capped (max 10%). It must NEVER loosen an opposing trade.

**Why:** the user asked for the master to "take all trades and become a higher-control winning algorithm." A track-record-driven edge that could relax risk on counter-trend trades would let a lucky streak make the fleet reckless. Capping it + aligned-only keeps the behavior bounded and honest (no win-rate promises — project constraint).

**How to apply:** if you touch `alphaAdjust` or the engine's mastery compute, preserve the aligned-only + capped invariant. Mastery is published on `AlphaState`, computed in the engine from `tradeHistory.filter(auto)`.

# Briefing page: advice-vs-education conflict

The user wanted "next-2-hours action scenarios for real accounts," but `replit.md` forbids financial advice / win-rate / return promises.

**Resolution:** the briefing frames everything as **educational scenarios to watch/learn from**, never buy/sell instructions, with a prominent "חינוכי בלבד — לא ייעוץ" disclaimer and an "opportunity alert" worded as "an opportunity to watch," not an order.

**Why:** hard project constraint — paper/demo only, never promise outcomes or give advice. This framing is the standing way to satisfy "tell me what to do" style requests without violating it.
