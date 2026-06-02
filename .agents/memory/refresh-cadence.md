---
name: Refresh cadence coupling (frontend poll vs server cache)
description: Why stock/recommendation refetchInterval must stay >= the server cache TTL, incl. the fast-refresh toggle floor
---

# Refresh cadence coupling

The stocks/recommendations endpoints in `artifacts/api-server` serve from an
in-memory cache (`stocks.ts` → `CACHE_TTL_MS`, currently 30s). The crypto-arb
frontend polls via React Query `refetchInterval`.

**Rule:** the frontend poll interval must be >= the server cache TTL. Polling
faster than the TTL just re-returns the same cached payload (same `fetchedAt`),
so "live" data feels stale despite the extra requests.

**Why:** a frontend interval shorter than the cache TTL produced repeated
identical responses and the appearance of frozen data.

**How to apply:**
- If you change the frontend `refetchInterval` for stocks/recommendations or the
  server `CACHE_TTL_MS`, change both in lockstep (keep TTL <= frontend interval).
- The global fast-refresh toggle (`contexts/refresh-context.tsx` → `intervalFor`)
  speeds up polling. Cache-backed queries (stocks, stock recs, crypto recs,
  scan, all-markets) MUST pass the `minMs` floor (`intervalFor(base, TTL)`) so
  "fast" mode never drops below the TTL. Only genuinely real-time streams
  (Binance multi, separate path, 5s) should use `intervalFor(base)` with no
  floor — that is where fast mode actually yields fresher data.
