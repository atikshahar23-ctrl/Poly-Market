---
name: News calendar bot
description: Rule-based news→calendar event extraction + 2-day alerter for crypto-arb
---

# News calendar bot (`/calendar`)

Rule-based (NO AI — replit.md constraint) bot that mines event dates from the shared
market-movers news feed and merges them with the static macro calendar.

- `lib/news-calendar-bot.ts` — extraction engine. Reuses `lib/market-calendar.ts`
  (getMacroEvents wraps getMarketNotes) so there is ONE source of FOMC/NFP/expiry truth.
- `hooks/use-calendar-events.ts` — reuses `getGetMarketMoversQueryKey()` so NO extra
  upstream fan-out; refetchInterval 180000 stays >= server movers cache TTL (3min).
- `components/calendar-alerter.tsx` — headless, mounted in AuthedApp; toasts high/medium
  events within 2 days, deduped via localStorage `arb_scan_calendar_seen` (seenRef guards
  re-toast storms across effect reruns).

**Why (date parsing):** JS `new Date(y, m, d)` silently rolls over invalid dates
(Feb 31 → Mar 3). Always round-trip through `safeDate()` which rejects any y/m/d that
doesn't survive construction. Same trap for bare "Month DD" year resolution.
**How to apply:** any future date extraction here must go through `safeDate`, and the
news loop must `typeof item.title === "string"` guard — feeds can carry non-string junk.
