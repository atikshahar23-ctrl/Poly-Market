import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface BookLevel {
  price: number;
  qty: number;
  total: number; // cumulative qty from spread outward
}

export interface TapeTrade {
  price: number;
  qty: number;
  isBuy: boolean; // aggressive buy (taker buy) = true
  ts: number;
}

export interface FlowMetrics {
  /** Bid depth total (top 20 levels) */
  bidDepth: number;
  /** Ask depth total (top 20 levels) */
  askDepth: number;
  /** (bidDepth - askDepth) / (bidDepth + askDepth) */
  imbalance: number;
  /** Aggressive buy volume in last 5s */
  buyVolume: number;
  /** Aggressive sell volume in last 5s */
  sellVolume: number;
  /** buyVolume - sellVolume */
  delta: number;
  /** Total aggressive volume in last 5s */
  tapeSpeed: number;
  /** Number of trades in last 5s */
  tapeCount: number;
  /** Ratio of buy trades to total trades */
  buyRatio: number;
  /** Bid/ask spread */
  spread: number;
  /** Best bid */
  bestBid: number;
  /** Best ask */
  bestAsk: number;
  /** Mid price */
  mid: number;
  /** Computed "feel" score: -1 (bearish) to +1 (bullish) */
  feel: number;
  /** 0–100 confidence in the feel direction */
  feelStrength: number;
  /** Textual readout */
  feelText: string;
  /** hebrew text */
  feelTextHe: string;
}

export interface OrderFlowState {
  symbol: string; // e.g. "BTCUSDT"
  connected: boolean;
  bids: BookLevel[];
  asks: BookLevel[];
  trades: TapeTrade[];
  metrics: FlowMetrics;
}

const MAX_TRADES = 200;
const METRICS_WINDOW_MS = 5_000;

function wsUrl(symbol: string): string {
  const s = symbol.toLowerCase();
  return `wss://data-stream.binance.vision/stream?streams=${s}@depth20@1000ms/${s}@aggTrade`;
}

function computeMetrics(
  bids: BookLevel[],
  asks: BookLevel[],
  trades: TapeTrade[],
  now: number,
): FlowMetrics {
  const recent = trades.filter((t) => now - t.ts <= METRICS_WINDOW_MS);
  const bidDepth = bids.reduce((sum, b) => sum + b.qty, 0);
  const askDepth = asks.reduce((sum, a) => sum + a.qty, 0);
  const totalDepth = bidDepth + askDepth;
  const imbalance = totalDepth > 0 ? (bidDepth - askDepth) / totalDepth : 0;

  const buyVolume = recent.filter((t) => t.isBuy).reduce((s, t) => s + t.qty, 0);
  const sellVolume = recent.filter((t) => !t.isBuy).reduce((s, t) => s + t.qty, 0);
  const tapeSpeed = buyVolume + sellVolume;
  const delta = buyVolume - sellVolume;
  const tapeCount = recent.length;
  const buyRatio = recent.length > 0 ? recent.filter((t) => t.isBuy).length / recent.length : 0.5;

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const mid = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : bestAsk || bestBid;

  // Feel algorithm: blend depth imbalance, tape delta, and buy ratio
  // All normalized to -1..+1
  const depthScore = imbalance; // -1..1
  const tapeScore = tapeSpeed > 0 ? delta / tapeSpeed : 0; // -1..1
  const ratioScore = (buyRatio - 0.5) * 2; // -1..1

  // Weighted blend: tape is most important for near-term feel, then depth
  const feel = depthScore * 0.25 + tapeScore * 0.45 + ratioScore * 0.30;
  const clampedFeel = Math.max(-1, Math.min(1, feel));

  // Strength: how much data is behind this feel
  const strength = Math.min(
    100,
    Math.round((tapeCount / 20) * 40 + (tapeSpeed > 0 ? 30 : 0) + Math.abs(clampedFeel) * 30),
  );

  let feelText = "Neutral";
  let feelTextHe = "נייטרלי";
  if (clampedFeel > 0.3) {
    feelText = "Bullish";
    feelTextHe = "בוליש";
  } else if (clampedFeel > 0.1) {
    feelText = "Slightly Bullish";
    feelTextHe = "בוליש קל";
  } else if (clampedFeel < -0.3) {
    feelText = "Bearish";
    feelTextHe = "בריש";
  } else if (clampedFeel < -0.1) {
    feelText = "Slightly Bearish";
    feelTextHe = "בריש קל";
  }

  return {
    bidDepth,
    askDepth,
    imbalance,
    buyVolume,
    sellVolume,
    delta,
    tapeSpeed,
    tapeCount,
    buyRatio,
    spread,
    bestBid,
    bestAsk,
    mid,
    feel: clampedFeel,
    feelStrength: strength,
    feelText,
    feelTextHe,
  };
}

class OrderFlowEngine {
  symbol = "BTCUSDT";
  bids: BookLevel[] = [];
  asks: BookLevel[] = [];
  trades: TapeTrade[] = [];
  connected = false;

  private ws: WebSocket | null = null;
  private listeners = new Set<() => void>();
  private reconnectDelay = 1_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private version = 0;

  private scheduleNotify() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  private pruneTrades() {
    const cutoff = Date.now() - METRICS_WINDOW_MS * 2;
    this.trades = this.trades.filter((t) => t.ts > cutoff);
    if (this.trades.length > MAX_TRADES) {
      this.trades = this.trades.slice(-MAX_TRADES);
    }
  }

  setSymbol(symbol: string) {
    if (symbol.toUpperCase() === this.symbol) return;
    this.symbol = symbol.toUpperCase();
    this.bids = [];
    this.asks = [];
    this.trades = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.reconnectDelay = 1_000;
    this.scheduleNotify();
    this.connect();
  }

  start() {
    if (this.started || typeof WebSocket === "undefined") return;
    this.started = true;
    this.connect();
    this.metricsTimer = setInterval(() => {
      this.pruneTrades();
    }, 1_000);
  }

  stop() {
    this.started = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    this.connected = false;
  }

  private connect() {
    if (!this.started) return;
    try {
      const ws = new WebSocket(wsUrl(this.symbol));
      this.ws = ws;
      ws.onopen = () => {
        this.connected = true;
        this.reconnectDelay = 1_000;
        this.scheduleNotify();
      };
      ws.onmessage = (ev) => this.onMessage(ev);
      ws.onclose = () => {
        this.connected = false;
        this.ws = null;
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* noop */
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = this.reconnectDelay;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
      this.connect();
    }, delay);
  }

  private onMessage(ev: MessageEvent) {
    let payload: unknown;
    try {
      payload = JSON.parse(ev.data as string);
    } catch {
      return;
    }
    if (typeof payload !== "object" || payload === null) return;
    const p = payload as Record<string, unknown>;

    // Combined stream wraps messages in { stream, data }
    const data = (p.data ?? p) as Record<string, unknown>;
    const event = data.e as string | undefined;

    if (event === "depthUpdate") {
      this.onDepth(data);
    } else if (event === "aggTrade") {
      this.onAggTrade(data);
    }
  }

  private onDepth(data: Record<string, unknown>) {
    const b = data.b as Array<[string, string]> | undefined;
    const a = data.a as Array<[string, string]> | undefined;
    if (!b || !a) return;

    const parseLevel = (row: [string, string]): BookLevel | null => {
      const price = parseFloat(row[0]);
      const qty = parseFloat(row[1]);
      if (!Number.isFinite(price) || !Number.isFinite(qty)) return null;
      return { price, qty, total: 0 };
    };

    const bids = b.map(parseLevel).filter((x): x is BookLevel => x !== null);
    const asks = a.map(parseLevel).filter((x): x is BookLevel => x !== null);
    if (bids.length === 0 && asks.length === 0) return;

    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);

    // Compute cumulative totals outward from spread
    let bidSum = 0;
    for (let i = 0; i < bids.length; i++) {
      bidSum += bids[i].qty;
      bids[i].total = bidSum;
    }
    let askSum = 0;
    for (let i = 0; i < asks.length; i++) {
      askSum += asks[i].qty;
      asks[i].total = askSum;
    }

    this.bids = bids;
    this.asks = asks;
    this.scheduleNotify();
  }

  private onAggTrade(data: Record<string, unknown>) {
    const price = parseFloat(data.p as string);
    const qty = parseFloat(data.q as string);
    const isBuyerMaker = data.m === true;
    if (!Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) return;

    // m=true  → buyer is maker = sell market order = aggressive sell
    // m=false → buyer is taker = aggressive buy
    const isBuy = !isBuyerMaker;
    this.trades.push({ price, qty, isBuy, ts: Date.now() });
    this.scheduleNotify();
  }

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    this.start();
    return () => {
      this.listeners.delete(cb);
    };
  }

  getState(): OrderFlowState {
    return {
      symbol: this.symbol,
      connected: this.connected,
      bids: this.bids,
      asks: this.asks,
      trades: this.trades.slice(-MAX_TRADES),
      metrics: computeMetrics(this.bids, this.asks, this.trades, Date.now()),
    };
  }

  getVersion() {
    return this.version;
  }
}

const engine = new OrderFlowEngine();

const OrderFlowContext = createContext<OrderFlowEngine>(engine);

export function OrderFlowProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    engine.start();
    return () => {
      engine.stop();
    };
  }, []);
  return <OrderFlowContext.Provider value={engine}>{children}</OrderFlowContext.Provider>;
}

export function useOrderFlow(): OrderFlowState {
  const eng = useContext(OrderFlowContext);
  const [, setTick] = useState(0);
  useEffect(() => {
    return eng.subscribe(() => setTick((v) => v + 1));
  }, [eng]);
  return eng.getState();
}

export function useOrderFlowSymbol() {
  const eng = useContext(OrderFlowContext);
  return {
    symbol: eng.symbol,
    setSymbol: useCallback((s: string) => eng.setSymbol(s), [eng]),
  };
}
