import { useMemo, useEffect, useState } from "react";

interface Level {
  price: number;
  size: number;
  total: number;
  pct: number;
}

function mkSeed(price: number) {
  return Math.floor(price * 10) / 10;
}

function seededRandom(seed: number, i: number, j: number) {
  const x = Math.sin(seed * 9301 + i * 49297 + j * 233) * 10000;
  return x - Math.floor(x);
}

function generateBook(price: number, levels = 14): {
  asks: Level[];
  bids: Level[];
  spread: number;
  spreadPct: number;
} {
  if (!price || price <= 0) return { asks: [], bids: [], spread: 0, spreadPct: 0 };
  const seed = mkSeed(price);
  const halfSpread = price * 0.00012;

  const rawAsks: { price: number; size: number }[] = [];
  for (let i = 0; i < levels; i++) {
    rawAsks.push({
      price: price + halfSpread + halfSpread * (i + 1) * (1 + seededRandom(seed, i, 0) * 0.3),
      size: (seededRandom(seed, i, 1) * 3 + 0.05) / (i * 0.25 + 1),
    });
  }
  rawAsks.sort((a, b) => a.price - b.price);

  const rawBids: { price: number; size: number }[] = [];
  for (let i = 0; i < levels; i++) {
    rawBids.push({
      price: price - halfSpread - halfSpread * (i + 1) * (1 + seededRandom(seed, i, 2) * 0.3),
      size: (seededRandom(seed, i, 3) * 3 + 0.05) / (i * 0.25 + 1),
    });
  }
  rawBids.sort((a, b) => b.price - a.price);

  let run = 0;
  const asks: Level[] = rawAsks.map((r) => {
    run += r.size;
    return { ...r, total: run, pct: 0 };
  });
  const maxAsk = asks[asks.length - 1]?.total ?? 1;
  asks.forEach((a) => { a.pct = (a.total / maxAsk) * 100; });

  run = 0;
  const bids: Level[] = rawBids.map((r) => {
    run += r.size;
    return { ...r, total: run, pct: 0 };
  });
  const maxBid = bids[bids.length - 1]?.total ?? 1;
  bids.forEach((b) => { b.pct = (b.total / maxBid) * 100; });

  const spread = rawAsks[0].price - rawBids[0].price;
  return { asks: asks.slice().reverse(), bids, spread, spreadPct: (spread / price) * 100 };
}

function fmtP(p: number) {
  if (p >= 10000) return p.toFixed(1);
  if (p >= 1000) return p.toFixed(2);
  if (p >= 100) return p.toFixed(3);
  return p.toFixed(4);
}

interface OrderBookProps {
  price: number;
  symbol: string;
}

export function OrderBook({ price, symbol }: OrderBookProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 3000);
    return () => window.clearInterval(id);
  }, []);

  const book = useMemo(
    () => generateBook(price),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mkSeed(price), tick]
  );

  return (
    <div className="flex flex-col w-full h-full bg-background text-[10px] font-mono select-none">
      <div className="px-2 py-1.5 border-b border-border shrink-0 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Order Book</span>
        <span className="text-muted-foreground/60">{symbol}USDT</span>
      </div>
      <div className="flex px-2 py-1 text-[9px] text-muted-foreground border-b border-border shrink-0">
        <span className="flex-1">Price</span>
        <span className="w-12 text-right">Size</span>
        <span className="w-14 text-right">Total</span>
      </div>

      {/* Asks (reversed so lowest is closest to spread) */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden min-h-0">
        {book.asks.map((lvl, i) => (
          <div key={i} className="relative flex px-2 py-[1.5px] hover:bg-red-500/5">
            <div className="absolute inset-y-0 right-0 bg-red-500/8" style={{ width: `${lvl.pct}%` }} />
            <span className="flex-1 text-red-400 z-10 relative">{fmtP(lvl.price)}</span>
            <span className="w-12 text-right text-muted-foreground z-10 relative">{lvl.size.toFixed(3)}</span>
            <span className="w-14 text-right text-muted-foreground/50 z-10 relative">{lvl.total.toFixed(3)}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="px-2 py-1.5 border-y border-border bg-card/40 shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-black text-foreground">${fmtP(price)}</span>
        <span className="text-[9px] text-muted-foreground">Sprd {book.spreadPct.toFixed(3)}%</span>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden min-h-0">
        {book.bids.map((lvl, i) => (
          <div key={i} className="relative flex px-2 py-[1.5px] hover:bg-emerald-500/5">
            <div className="absolute inset-y-0 right-0 bg-emerald-500/8" style={{ width: `${lvl.pct}%` }} />
            <span className="flex-1 text-emerald-400 z-10 relative">{fmtP(lvl.price)}</span>
            <span className="w-12 text-right text-muted-foreground z-10 relative">{lvl.size.toFixed(3)}</span>
            <span className="w-14 text-right text-muted-foreground/50 z-10 relative">{lvl.total.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
