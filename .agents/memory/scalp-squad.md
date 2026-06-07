---
name: Scalp Squad (5-bot scalp) + Max Performance mode
description: How the coordinated 5-bot scalp squad, its live comms feed, and the one-tap Max Performance mode fit together; the wallet-scoped seeding trap.
---

# Scalp Squad + Max Performance

Replaced the single scalp bot with 5 coordinating scalp members. Each member has a UNIQUE
`source` tag of the form `Scalp Squad · <name>`. This shape matters:

- Fleet/count rollups that match scalp via `source.includes("Scalp")` STILL catch the squad
  (the tag contains "Scalp"). Per-member stats instead match the EXACT `source` string.
- Candidates are spread across members by `assignScalpSquad()` (greedy load-balance,
  `perMemberMax = ceil(maxOpen/2)`); the open loop remaps the scalp candidate's source to the
  assigned member's source before opening.

## Live comms feed (`src/lib/squad-comms.ts`)
Module-level pub/sub via `useSyncExternalStore` (NOT React state) so the headless engine can
push and any component can subscribe. `squadIso()` wraps volatile tokens (symbols, signed USD)
in Unicode bidi isolates `\u2068…\u2069` — required or numbers/slashes reorder in the RTL feed.

## Wallet-scoped seeding trap (the bug to never reintroduce)
**`tradeHistory` is wallet-scoped.** Any "announce only NEW closed trades" effect must seed its
seen-set per wallet, not once. The squad exit-comms effect tracks `squadWalletRef`; on first run
OR when `activeWalletId` changes it reseeds the seen-set from the new wallet's current ledger and
calls `clearSquadMessages()`. Without this, switching to a wallet with history replays every old
exit as a comms flood.
**Why:** same class of bug as per-asset caution — that one is solved differently, via the
PERSISTED `settings.recordedTradeIds` ledger (survives reload AND wallet switch), because caution
must never double-count; comms only needs "don't replay", so a per-wallet in-memory reseed is enough.

## Max Performance ("מצב מקסימום")
One `settings.maxPerfEnabled` flag. All overrides live in `effectiveSettings` (computed, not
persisted) so toggling off restores the user's values: intensity 5, NORMAL mode, leverage≥10,
maxOpen≥12, all `*MaxOpen` bumps, `riskManagerEnabled: true`. It intentionally does NOT touch
dynamic/fixed sizing. Safety nets stay live: $3,000 cash floor (`cashReserveFloor`) and
losing-bot auto-pause (risk manager). Toggle also `armAll(true)`.
