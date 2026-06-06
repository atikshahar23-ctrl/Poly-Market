---
name: Live real-time price + chart layer
description: How sub-second crypto prices and live candles are streamed for free, and the interval-casing gotcha that breaks daily charts.
---

# Live real-time layer (zero-cost)

- Crypto live prices come from one shared browser WebSocket to Binance miniTicker (`live-price-context.tsx`), exposed via `useLivePrices()`/`useLivePrice()`. The AutoTrader engine, simulator, and trade-desk all overlay these over their polled REST baseline so displayed prices + SL/TP/guards react near-instantly (REST is just fallback/asset-list).
- **The live store keys on the BASE asset (`BTC`), not the pair (`BTCUSDT`)** — it does `sym.slice(0,-4)` on ingest. Pass the base asset to `useLivePrice`/`live.get`, or the lookup silently misses and you fall back to the slow REST price (this bit trade-desk's `useCryptoPrice`).
- Once the WS is the real-time path, floor the REST `binance/multi` poll at 5s even in fast mode (`intervalFor(5000, 5000)`). Fast-mode sub-2s polling blew the server's global 120/min per-IP limiter → 429 storm that froze the baseline. The WS keeps prices fresh regardless, so flooring the REST is pure upside.
- Candlestick charts seed from REST (`data-api.binance.vision`) then switch to a per-symbol kline WebSocket; REST polling is only a fallback if the socket never opens.

## Binance interval casing gotcha
**The UI uses `"1D"` as the daily interval label, but Binance REST + WS endpoints require lowercase `"1d"`.**
**Why:** A `1D` value sent to the Binance kline REST/WS URL returns a 4xx, so the daily chart (initial load AND polling fallback) silently fails.
**How to apply:** Normalize before every Binance call — `const i = period === "1D" ? "1d" : period`. Use that normalized value for the WS subscribe URL, the initial `fetchKlines`, and the polling-fallback `fetchKlines`. Don't normalize for WS only.
