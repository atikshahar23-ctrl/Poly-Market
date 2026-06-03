import { logger } from "./logger";
import { fetchKlines, fetchMarketOverview, type Kline } from "./binance";

export type MomentumStage = "SURGING" | "BUILDING" | "HOT" | "COOLING";

export interface MomentumCoin {
  symbol: string;
  asset: string;
  price: number;
  change24h: number;
  /** Recent volume vs the session average (multiple, e.g. 3 = 3× normal). */
  rvol: number;
  /** Rate of change over the last ~15 minutes (percent). */
  roc15m: number;
  /** Rate of change over the last ~1 hour (percent). */
  roc1h: number;
  /** Consecutive rising 5m candles at the tail. */
  greenStreak: number;
  /** Where price sits in its recent range (0 = low, 100 = high). */
  rangePosition: number;
  /** 0-100 composite surge score. */
  score: number;
  stage: MomentumStage;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasons: string[];
}

/* ── Helpers ───────────────────────────────────────────────────── */

function atr(klines: Kline[], period = 14): number {
  if (klines.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const cur = klines[i];
    const prevClose = klines[i - 1].close;
    trs.push(Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prevClose),
      Math.abs(cur.low - prevClose),
    ));
  }
  const window = trs.slice(-period);
  return window.reduce((a, b) => a + b, 0) / window.length;
}

function round(v: number, price: number): number {
  return parseFloat(v.toFixed(price < 1 ? 6 : 2));
}

/* ── Surge analysis ────────────────────────────────────────────── */

/**
 * Score a coin's short-term momentum on 5m candles. Emphasis on relative
 * volume (the #1 "in play" tell) and rate-of-change acceleration — the
 * fingerprint of a coin flying up or coiling to surge.
 */
function analyze(coin: { symbol: string; asset: string; changePercent: number }, klines: Kline[]): MomentumCoin | null {
  if (klines.length < 30) return null;
  const closes = klines.map((k) => k.close);
  const vols = klines.map((k) => k.volume);
  const price = closes[closes.length - 1];
  if (!Number.isFinite(price) || price <= 0) return null;

  // Relative volume: last 3 candles (~15m) vs the full-window average.
  const recentVol = vols.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
  const rvol = avgVol > 0 ? recentVol / avgVol : 0;

  // Rate of change.
  const c3 = closes[closes.length - 4] ?? closes[0];
  const c12 = closes[closes.length - 13] ?? closes[0];
  const roc15m = c3 > 0 ? ((price - c3) / c3) * 100 : 0;
  const roc1h = c12 > 0 ? ((price - c12) / c12) * 100 : 0;

  // Green streak at the tail.
  let greenStreak = 0;
  for (let i = klines.length - 1; i > 0; i--) {
    if (klines[i].close > klines[i].open) greenStreak++;
    else break;
  }

  // Range position over the last 24 candles (2h).
  const recent = klines.slice(-24);
  const hi = Math.max(...recent.map((k) => k.high));
  const lo = Math.min(...recent.map((k) => k.low));
  const range = hi - lo;
  const rangePosition = range > 0 ? ((price - lo) / range) * 100 : 50;

  const atrVal = atr(klines, 14);

  // ── Score (0-100) ──
  const reasons: string[] = [];
  let score = 0;

  // Relative volume (max 38)
  const rvolPts = Math.min(38, Math.max(0, (rvol - 1) * 19));
  score += rvolPts;
  if (rvol >= 3) reasons.push(`Volume ${rvol.toFixed(1)}× normal — heavy interest`);
  else if (rvol >= 1.8) reasons.push(`Volume building ${rvol.toFixed(1)}× normal`);

  // Short-term ROC (max 26)
  const rocPts = Math.min(26, Math.max(0, roc15m * 4));
  score += rocPts;
  if (roc15m >= 3) reasons.push(`Up ${roc15m.toFixed(1)}% in 15m — fast move`);
  else if (roc15m >= 1) reasons.push(`Up ${roc15m.toFixed(1)}% in 15m`);

  // 1h ROC (max 14)
  score += Math.min(14, Math.max(0, roc1h * 1.4));
  if (roc1h >= 6) reasons.push(`Up ${roc1h.toFixed(1)}% in 1h — strong trend`);

  // Acceleration: 15m pace outrunning the 1h average pace (max 8)
  const pace1h = roc1h / 4; // per-15m-equivalent
  if (roc15m > pace1h && roc15m > 0.5) {
    score += 8;
    reasons.push("Accelerating — pace increasing");
  }

  // Green streak (max 8)
  score += Math.min(8, greenStreak * 2);
  if (greenStreak >= 4) reasons.push(`${greenStreak} green candles in a row`);

  // Range position / breakout (max 6)
  if (rangePosition >= 90) { score += 6; reasons.push("Breaking 2h high"); }
  else if (rangePosition >= 75) { score += 3; reasons.push("Pressing toward 2h high"); }

  score = Math.round(Math.min(100, score));

  // ── Stage classification ──
  let stage: MomentumStage;
  if (rvol >= 2.5 && roc15m >= 2.5) stage = "HOT";
  else if (roc15m >= 1 && rvol >= 1.5) stage = "SURGING";
  else if (rvol >= 1.6 && rangePosition >= 65 && roc15m >= -0.5) stage = "BUILDING";
  else stage = "COOLING";

  // ── Suggested LONG levels (momentum is long-biased) ──
  const stopDist = atrVal > 0 ? atrVal * 1.3 : price * 0.012;
  const targetDist = atrVal > 0 ? atrVal * 2.6 : price * 0.025;
  const entry = price;
  const stopLoss = price - stopDist;
  const takeProfit = price + targetDist;

  if (reasons.length === 0) reasons.push("Quiet — no surge yet");

  return {
    symbol: coin.symbol,
    asset: coin.asset,
    price: round(price, price),
    change24h: parseFloat(coin.changePercent.toFixed(2)),
    rvol: parseFloat(rvol.toFixed(2)),
    roc15m: parseFloat(roc15m.toFixed(2)),
    roc1h: parseFloat(roc1h.toFixed(2)),
    greenStreak,
    rangePosition: parseFloat(rangePosition.toFixed(1)),
    score,
    stage,
    entry: round(entry, price),
    stopLoss: round(stopLoss, price),
    takeProfit: round(takeProfit, price),
    reasons: reasons.slice(0, 4),
  };
}

/* ── Cache + public API ────────────────────────────────────────── */

let _cache: { data: MomentumCoin[]; expiresAt: number; key: string } | null = null;
let _inflight: { key: string; promise: Promise<MomentumCoin[]> } | null = null;
const CACHE_TTL_MS = 60 * 1000;
const CONCURRENCY = 8;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Scan the top-N liquid coins on 5m candles for surge momentum. Returns the
 * strongest movers sorted by score (highest first), capped to `top`.
 */
export async function fetchMomentumCoins(opts: { coins?: number; top?: number } = {}): Promise<MomentumCoin[]> {
  const { coins = 60, top = 24 } = opts;
  const cacheKey = `5m:${coins}:${top}`;
  if (_cache && Date.now() < _cache.expiresAt && _cache.key === cacheKey) {
    return _cache.data;
  }
  if (_inflight && _inflight.key === cacheKey) return _inflight.promise;

  const promise = (async () => {
    const overview = await fetchMarketOverview(coins);

    const results = await mapLimit(overview, CONCURRENCY, async (coin) => {
      try {
        const klines = await fetchKlines(coin.symbol, "5m", 72);
        return analyze({ symbol: coin.symbol, asset: coin.asset, changePercent: coin.changePercent }, klines);
      } catch (err) {
        logger.warn({ err: String(err), symbol: coin.symbol }, "Momentum analyze failed");
        return null;
      }
    });

    const coinsOut = results
      .filter((c): c is MomentumCoin => c !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, top);

    _cache = { data: coinsOut, expiresAt: Date.now() + CACHE_TTL_MS, key: cacheKey };
    return coinsOut;
  })();

  _inflight = { key: cacheKey, promise };
  try {
    return await promise;
  } finally {
    if (_inflight && _inflight.promise === promise) _inflight = null;
  }
}
