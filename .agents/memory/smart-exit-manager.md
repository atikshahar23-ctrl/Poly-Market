---
name: Smart Exit (scalp & runner) manager
description: Why bot crypto exits use a regime-based peak-pullback trail instead of fixed TP, and the invariants that keep it safe.
---

# Smart Exit — scalp & runner

Bot AUTO crypto (Binance) trades exit via a **single peak-pullback trail with two regimes**, not a fixed take-profit:
- Below `scalpTakeProfitPct` favorable price move: no smart close (normal SL/TP/warrior-trail handle it).
- Once peak gain ≥ `scalpTakeProfitPct`: bank on a *tight* `scalpGivebackPct` pullback → fast "supermarket" turnover.
- Once peak gain ≥ `runnerTriggerPct`: switch to a *wider* `runnerTrailPct` giveback → let big winners ride until reversal.
- Stale-but-green trades older than `maxScalpHoldSec` are recycled to free capital.

**Why a regime trail, not a fixed scalp TP:** a fixed +0.6% close would cap every winner at 0.6% and defeat "let big winners run." A trail that only tightens on pullback closes fast when momentum stalls but rides as long as price keeps making new extrema — satisfying both halves of the request in one mechanism. Thresholds are all **price-move %** (leverage-independent), consistent with the existing warrior trail.

**Invariants / gotchas:**
- Smart-exit closes are profit-only — the pullback-close requires `gainPct > 0` so the trail can never close below breakeven (don't remove this guard; aggressive user giveback settings could otherwise close a once-green trade at a loss).
- Runs in the live price-pipeline effect (sub-second WS via `liveVersion`); peak tracked per-position in a `peakRef` Map, GC'd for closed ids each tick.
- Closes go through `closeBinancePosition(id, price, "TP")`. That helper takes an optional `exit` (default `MANUAL`) and already carries `auto`+`openedAt`, so ExtraBotsEngine attribution (match by `openedAt`) still works for dip/breakout bots.
- Same-tick composition with `checkSlTp` is safe: both use functional setState updaters, so a second close on an already-removed position no-ops.
- 3s min-hold (`ageMs < 3000`) prevents open→close flapping in the same breath.
