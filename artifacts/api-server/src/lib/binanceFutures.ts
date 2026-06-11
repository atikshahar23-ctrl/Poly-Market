import { signBinance } from "./crypto";

/**
 * Binance USDⓈ-M Futures execution helpers.
 *
 * Every function takes a `mode` ('testnet' | 'mainnet') that selects the base
 * URL, plus the caller's decrypted API key + secret. Signing reuses the shared
 * HMAC-SHA256 helper from crypto.ts. All requests are server-only — keys are
 * never exposed to the browser.
 *
 * NOTE: this module PLACES REAL ORDERS. It is gated upstream by an explicit
 * per-environment `liveTradingEnabled` flag and is only ever reached for bot
 * (auto) positions, never manual UI trades.
 */

const TESTNET_BASE = "https://testnet.binancefuture.com";
const MAINNET_BASE = "https://fapi.binance.com";

export type FuturesMode = "testnet" | "mainnet";

export interface FuturesCreds {
  apiKey: string;
  secret: string;
}

/** Thrown when Binance returns HTTP 451 (geo-block) so callers can surface a clear message. */
export class GeoBlockError extends Error {
  readonly code = "GEO_BLOCK";
  constructor(message = "Binance Futures is geo-blocked from this region") {
    super(message);
    this.name = "GeoBlockError";
  }
}

/** Thrown on any non-OK Binance Futures response (carries Binance's own code/msg). */
export class BinanceFuturesError extends Error {
  readonly status: number;
  readonly binanceCode?: number;
  constructor(status: number, message: string, binanceCode?: number) {
    super(message);
    this.name = "BinanceFuturesError";
    this.status = status;
    this.binanceCode = binanceCode;
  }
}

function baseUrl(mode: FuturesMode): string {
  return mode === "testnet" ? TESTNET_BASE : MAINNET_BASE;
}

/** A signed Binance Futures request. Returns parsed JSON or throws a typed error. */
async function signedRequest<T = unknown>(
  mode: FuturesMode,
  method: "GET" | "POST" | "DELETE" | "PUT",
  path: string,
  params: Record<string, string | number | boolean>,
  creds: FuturesCreds,
): Promise<T> {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) search.set(k, String(v));
  search.set("timestamp", String(Date.now()));
  search.set("recvWindow", "5000");
  const qs = search.toString();
  const signature = signBinance(qs, creds.secret);
  const url = `${baseUrl(mode)}${path}?${qs}&signature=${signature}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { "X-MBX-APIKEY": creds.apiKey },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new BinanceFuturesError(0, `Network error reaching Binance Futures: ${(err as Error).message}`);
  }

  if (res.status === 451) throw new GeoBlockError();

  const text = await res.text().catch(() => "");
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && "msg" in json && typeof (json as { msg: unknown }).msg === "string")
        ? (json as { msg: string }).msg
        : (typeof json === "string" && json) || `Binance Futures error (HTTP ${res.status})`;
    const code =
      json && typeof json === "object" && "code" in json && typeof (json as { code: unknown }).code === "number"
        ? (json as { code: number }).code
        : undefined;
    throw new BinanceFuturesError(res.status, msg, code);
  }

  return json as T;
}

/** Public (unsigned) GET — used for exchangeInfo quantity precision. */
async function publicGet<T = unknown>(mode: FuturesMode, path: string): Promise<T> {
  const res = await fetch(`${baseUrl(mode)}${path}`, { signal: AbortSignal.timeout(10_000) });
  if (res.status === 451) throw new GeoBlockError();
  if (!res.ok) throw new BinanceFuturesError(res.status, `Binance Futures error (HTTP ${res.status})`);
  return (await res.json()) as T;
}

// ── Quantity precision (stepSize) cache ──────────────────────────────────────
interface SymbolFilter {
  stepSize: number;
  minQty: number;
}
const filterCache: Record<FuturesMode, { at: number; map: Map<string, SymbolFilter> } | null> = {
  testnet: null,
  mainnet: null,
};
const FILTER_TTL_MS = 60 * 60 * 1000;

async function getSymbolFilters(mode: FuturesMode): Promise<Map<string, SymbolFilter>> {
  const cached = filterCache[mode];
  if (cached && Date.now() - cached.at < FILTER_TTL_MS) return cached.map;

  const info = await publicGet<{
    symbols: Array<{ symbol: string; filters: Array<{ filterType: string; stepSize?: string; minQty?: string }> }>;
  }>(mode, "/fapi/v1/exchangeInfo");

  const map = new Map<string, SymbolFilter>();
  for (const s of info.symbols ?? []) {
    const lot = s.filters?.find((f) => f.filterType === "LOT_SIZE" || f.filterType === "MARKET_LOT_SIZE");
    if (lot?.stepSize) {
      map.set(s.symbol, {
        stepSize: parseFloat(lot.stepSize),
        minQty: parseFloat(lot.minQty ?? "0"),
      });
    }
  }
  filterCache[mode] = { at: Date.now(), map };
  return map;
}

/** Round a quantity down to the symbol's stepSize (Binance rejects mismatched precision). */
function roundToStep(qty: number, stepSize: number): number {
  if (!(stepSize > 0)) return qty;
  const decimals = Math.max(0, Math.round(-Math.log10(stepSize)));
  const rounded = Math.floor(qty / stepSize) * stepSize;
  return parseFloat(rounded.toFixed(decimals));
}

/** Ensure a USDT-pair symbol (e.g. "BTC" → "BTCUSDT"). */
export function toFuturesSymbol(asset: string): string {
  const a = asset.toUpperCase();
  return a.endsWith("USDT") ? a : `${a}USDT`;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface FuturesBalance {
  totalUsdt: number;
  availableUsdt: number;
}

/** USDT wallet + available balance for the futures account. */
export async function getFuturesBalance(mode: FuturesMode, creds: FuturesCreds): Promise<FuturesBalance> {
  const balances = await signedRequest<Array<{ asset: string; balance: string; availableBalance: string }>>(
    mode,
    "GET",
    "/fapi/v2/balance",
    {},
    creds,
  );
  const usdt = balances.find((b) => b.asset === "USDT");
  return {
    totalUsdt: usdt ? parseFloat(usdt.balance) : 0,
    availableUsdt: usdt ? parseFloat(usdt.availableBalance) : 0,
  };
}

/** Validate credentials with a lightweight signed call. Returns true when usable. */
export async function validateFutures(mode: FuturesMode, creds: FuturesCreds): Promise<boolean> {
  try {
    await getFuturesBalance(mode, creds);
    return true;
  } catch (err) {
    if (err instanceof GeoBlockError) throw err; // surface geo-block distinctly
    return false;
  }
}

/** Set leverage for a symbol. Best-effort: leverage caps vary per symbol. */
export async function setLeverage(
  mode: FuturesMode,
  creds: FuturesCreds,
  symbol: string,
  leverage: number,
): Promise<void> {
  const lev = Math.max(1, Math.min(125, Math.round(leverage)));
  await signedRequest(mode, "POST", "/fapi/v1/leverage", { symbol, leverage: lev }, creds);
}

export interface PlacedOrder {
  orderId: string;
  fillPrice: number;
  fillQty: number;
}

/** Place a MARKET order. `reduceOnly` is used for closes. Quantity is rounded to stepSize. */
export async function placeMarketOrder(
  mode: FuturesMode,
  creds: FuturesCreds,
  args: { symbol: string; side: "BUY" | "SELL"; quantity: number; reduceOnly?: boolean },
): Promise<PlacedOrder> {
  const filters = await getSymbolFilters(mode);
  const filt = filters.get(args.symbol);
  const qty = filt ? roundToStep(args.quantity, filt.stepSize) : args.quantity;
  if (!(qty > 0) || (filt && qty < filt.minQty)) {
    throw new BinanceFuturesError(400, `Quantity ${args.quantity} below minimum tradable size for ${args.symbol}`);
  }

  const params: Record<string, string | number | boolean> = {
    symbol: args.symbol,
    side: args.side,
    type: "MARKET",
    quantity: qty,
    newOrderRespType: "RESULT",
  };
  if (args.reduceOnly) params.reduceOnly = "true";

  const order = await signedRequest<{
    orderId: number;
    avgPrice?: string;
    executedQty?: string;
  }>(mode, "POST", "/fapi/v1/order", params, creds);

  return {
    orderId: String(order.orderId),
    fillPrice: order.avgPrice ? parseFloat(order.avgPrice) : 0,
    fillQty: order.executedQty ? parseFloat(order.executedQty) : qty,
  };
}

export interface FuturesPosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

/** All open futures positions (positionAmt != 0). */
export async function syncFuturesPositions(mode: FuturesMode, creds: FuturesCreds): Promise<FuturesPosition[]> {
  const rows = await signedRequest<
    Array<{ symbol: string; positionAmt: string; entryPrice: string; unRealizedProfit: string; leverage: string }>
  >(mode, "GET", "/fapi/v2/positionRisk", {}, creds);
  return rows
    .map((r) => ({
      symbol: r.symbol,
      positionAmt: parseFloat(r.positionAmt),
      entryPrice: parseFloat(r.entryPrice),
      unrealizedPnl: parseFloat(r.unRealizedProfit),
      leverage: parseFloat(r.leverage),
    }))
    .filter((p) => Math.abs(p.positionAmt) > 0);
}

/** Market-close a symbol's open position with a reduceOnly order. Returns the order id, or null if flat. */
export async function closePosition(
  mode: FuturesMode,
  creds: FuturesCreds,
  symbol: string,
): Promise<string | null> {
  const positions = await syncFuturesPositions(mode, creds);
  const pos = positions.find((p) => p.symbol === symbol);
  if (!pos || pos.positionAmt === 0) return null;
  const side: "BUY" | "SELL" = pos.positionAmt > 0 ? "SELL" : "BUY";
  const order = await placeMarketOrder(mode, creds, {
    symbol,
    side,
    quantity: Math.abs(pos.positionAmt),
    reduceOnly: true,
  });
  return order.orderId;
}

/** Cancel all open (resting) orders across every symbol that has any. */
export async function cancelAllOpenOrders(mode: FuturesMode, creds: FuturesCreds): Promise<void> {
  const open = await signedRequest<Array<{ symbol: string }>>(mode, "GET", "/fapi/v1/openOrders", {}, creds);
  const symbols = [...new Set(open.map((o) => o.symbol))];
  await Promise.allSettled(
    symbols.map((symbol) => signedRequest(mode, "DELETE", "/fapi/v1/allOpenOrders", { symbol }, creds)),
  );
}

/** Emergency: cancel all resting orders, then market-close every open position. */
export async function closeAllPositions(
  mode: FuturesMode,
  creds: FuturesCreds,
): Promise<{ closed: number }> {
  await cancelAllOpenOrders(mode, creds);
  const positions = await syncFuturesPositions(mode, creds);
  const results = await Promise.allSettled(positions.map((p) => closePosition(mode, creds, p.symbol)));
  const closed = results.filter((r) => r.status === "fulfilled" && r.value).length;
  return { closed };
}
