---
name: Master Advisor
description: The single top-level rule-based advisor (/advisor) — what it must synthesize over and the gating rules that keep it safe
---

# Master Advisor (`/advisor`, "היועץ הראשי")

A single top-level, bilingual (he/en) rule-based persona that synthesizes ONE
market+portfolio read and proposes ranked moves the user must Approve/Dismiss.

**It must reason over the WHOLE app, not just market data.** A reviewer will
reject it if the read/moves ignore any of: cross-source signal strength (scalp /
momentum / stock recs / polymarket, not just the alpha consensus), per-bot
standing (win-rate, net, paused, adaptive edge), and multi-wallet health.
**Why:** the task is "read the whole app's state and synthesize", so leaning only
on alpha + overview + fear/greed reads as a partial implementation.
**How to apply:** the snapshot the page builds must carry per-bot rows (mirror the
Bot Command fleet roll-up: attribute closed trades by `source`/`type`), every
wallet's cash buffer, and counts of strong signals per source — and the engine
must actually use them in bias/conviction and in move ranking, and the page must
render bot-standing + wallet-ranking in the briefing.

**Engine stays pure & side-effect free.** `lib/master-advisor.ts` only takes an
`AdvisorSnapshot` and returns localized text + an `AdvisorActionSpec`; it never
executes. The page maps each `action.kind` to existing context helpers and runs
it ONLY after explicit user approval. **Why:** the project's hard constraint is
educational paper-trading — nothing auto-executes and everything is framed as a
"scenario to watch", never advice.

**Reuse, don't re-fetch.** The page must use the SAME query hooks + query keys +
refetch cadence as the rest of the app so it adds zero upstream fan-out. No new
polling, APIs, or signal pipelines.

**Snapshot quirks worth remembering:**
- `movers.fearGreed` is a `FearGreed { value, classification }` object — use
  `.value`.
- Drawdown is estimated MTM-agnostic: `cash + committed` (binance margin =
  notional/leverage, stock+poly = cost). This stops locked margin from reading as
  a loss.
- Per-wallet detail beyond the active wallet is limited: `wallets` is a summary
  list (id, name, cash, totalDeposited, openPositions) with NO per-wallet trade
  history, so cross-wallet ranking can only use the cash buffer, not win-rate.
- Approve/Dismiss state is session-scoped (in-memory Set), intentionally not
  persisted.

**No test harness exists** in this monorepo (no vitest at root), so the pure
engine currently has no unit tests — adding a runner is a separate setup task.
