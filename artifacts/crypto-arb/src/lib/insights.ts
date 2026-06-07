import type {
  ClosedTrade,
  BinancePosition,
  StockPosition,
  PolyPosition,
  FundingPosition,
  OptionPosition,
} from "@/contexts/portfolio-context";
import type { BotStat } from "@/contexts/autotrader-context";
import { assetCautionFromStat } from "@/contexts/autotrader-context";

/* ──────────────────────────────────────────────────────────────────────────
 * Rule-based analytics & insights engine.
 *
 * Pure functions only — no React, no paid AI. Aggregates closed-trade history,
 * open positions and the per-asset caution scorecards into per-asset-class and
 * per-bot summaries plus plain-language Hebrew conclusions, framed strictly as
 * educational observations (never advice or guarantees).
 * ──────────────────────────────────────────────────────────────────────── */

export type AssetClass = ClosedTrade["type"];

export const ASSET_CLASSES: AssetClass[] = [
  "BINANCE",
  "STOCK",
  "POLYMARKET",
  "OPTION",
  "FUNDING",
];

export const CLASS_LABEL_HE: Record<AssetClass, string> = {
  BINANCE: "קריפטו (פיוצ'רס)",
  STOCK: "מניות",
  POLYMARKET: "הימורי שוק",
  OPTION: "אופציות",
  FUNDING: "מימון דלתא-נייטרל",
};

export interface SymbolAgg {
  symbol: string;
  trades: number;
  wins: number;
  winRate: number;
  net: number;
  avg: number;
}

export interface ClassAgg {
  key: AssetClass;
  label: string;
  trades: number;
  wins: number;
  winRate: number;
  net: number;
  avg: number;
  /** Net of the most recent (up to 8) trades — short-term momentum. */
  recentNet: number;
  best: SymbolAgg | null;
  worst: SymbolAgg | null;
  symbols: SymbolAgg[];
  /** Chronological cumulative-PnL curve for a sparkline. */
  curve: number[];
  openCount: number;
  /** Capital currently committed to open positions of this class (USD). */
  openCapital: number;
}

export interface BotDef {
  key: string;
  title: string;
  match: (t: ClosedTrade) => boolean;
}

/** Per-bot matchers — mirrors the labelling used on the History page. */
export const BOT_DEFS: BotDef[] = [
  { key: "scalp", title: "סקאלפ", match: (t) => (t.source ?? "").includes("Scalp") },
  { key: "momentum", title: "מומנטום", match: (t) => (t.source ?? "").includes("Momentum") },
  { key: "smart", title: "כסף חכם", match: (t) => (t.source ?? "").includes("Smart-Money") },
  { key: "dipbuyer", title: "קונה ירידות", match: (t) => t.source === "Dip Buyer" },
  { key: "breakout", title: "צייד פריצות", match: (t) => t.source === "Breakout Hunter" },
  { key: "dca", title: "צבירת בלו-צ'יפ", match: (t) => t.source === "Blue-Chip DCA" },
  { key: "poly", title: "הימורי קריפטו", match: (t) => t.type === "POLYMARKET" },
  { key: "funding", title: "מימון", match: (t) => t.type === "FUNDING" },
  { key: "options", title: "אופציות", match: (t) => t.type === "OPTION" },
];

export interface BotAgg {
  key: string;
  title: string;
  trades: number;
  wins: number;
  winRate: number;
  net: number;
  avg: number;
  recentNet: number;
  curve: number[];
  /** Adaptive selectivity multiplier from the manager (1 = baseline). */
  edge: number;
}

export interface CautionEntry {
  symbol: string;
  caution: number;
  trades: number;
  winRate: number;
  net: number;
}

export interface OpenPositions {
  binance: BinancePosition[];
  stock: StockPosition[];
  poly: PolyPosition[];
  funding: FundingPosition[];
  option: OptionPosition[];
}

export interface InsightsData {
  totalTrades: number;
  totalWins: number;
  overallWinRate: number;
  totalNet: number;
  totalOpen: number;
  classAggs: ClassAgg[];
  botAggs: BotAgg[];
  bestSymbols: SymbolAgg[];
  worstSymbols: SymbolAgg[];
  cautioned: CautionEntry[];
  conclusions: string[];
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function fmtUsd(n: number, dp = 2): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function signed(n: number, dp = 2): string {
  return `${n >= 0 ? "+" : "-"}$${fmtUsd(Math.abs(n), dp)}`;
}

/** Cumulative-PnL curve over trades, oldest → newest (history is newest-first). */
function curveOf(trades: ClosedTrade[]): number[] {
  const chrono = [...trades].reverse();
  let c = 0;
  const pts: number[] = [0];
  for (const t of chrono) {
    c += t.pnl;
    pts.push(c);
  }
  return pts;
}

/** Net PnL of the most recent `n` trades (history is newest-first). */
function recentNetOf(trades: ClosedTrade[], n = 8): number {
  return trades.slice(0, n).reduce((a, t) => a + t.pnl, 0);
}

export function computeSymbolAggs(trades: ClosedTrade[]): SymbolAgg[] {
  const map = new Map<string, { trades: number; wins: number; net: number }>();
  for (const t of trades) {
    const symbol = (t.symbol ?? t.description ?? "—").toUpperCase();
    const e = map.get(symbol) ?? { trades: 0, wins: 0, net: 0 };
    e.trades += 1;
    if (t.pnl > 0) e.wins += 1;
    e.net += t.pnl;
    map.set(symbol, e);
  }
  return [...map.entries()].map(([symbol, e]) => ({
    symbol,
    trades: e.trades,
    wins: e.wins,
    winRate: e.trades ? (e.wins / e.trades) * 100 : 0,
    net: e.net,
    avg: e.trades ? e.net / e.trades : 0,
  }));
}

function openCapitalFor(key: AssetClass, open: OpenPositions): { count: number; capital: number } {
  switch (key) {
    case "BINANCE":
      return {
        count: open.binance.length,
        capital: open.binance.reduce((a, p) => a + (p.leverage ? p.notional / p.leverage : p.notional), 0),
      };
    case "STOCK":
      return { count: open.stock.length, capital: open.stock.reduce((a, p) => a + p.cost, 0) };
    case "POLYMARKET":
      return { count: open.poly.length, capital: open.poly.reduce((a, p) => a + p.cost, 0) };
    case "FUNDING":
      return { count: open.funding.length, capital: open.funding.reduce((a, p) => a + p.notionalPerLeg, 0) };
    case "OPTION":
      return { count: open.option.length, capital: open.option.reduce((a, p) => a + p.premiumPaid, 0) };
    default:
      return { count: 0, capital: 0 };
  }
}

export function computeClassAggs(tradeHistory: ClosedTrade[], open: OpenPositions): ClassAgg[] {
  return ASSET_CLASSES.map((key) => {
    const trades = tradeHistory.filter((t) => t.type === key);
    const wins = trades.filter((t) => t.pnl > 0).length;
    const net = trades.reduce((a, t) => a + t.pnl, 0);
    const symbols = computeSymbolAggs(trades).sort((a, b) => b.net - a.net);
    const { count, capital } = openCapitalFor(key, open);
    return {
      key,
      label: CLASS_LABEL_HE[key],
      trades: trades.length,
      wins,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
      net,
      avg: trades.length ? net / trades.length : 0,
      recentNet: recentNetOf(trades),
      best: symbols.length ? symbols[0] : null,
      worst: symbols.length ? symbols[symbols.length - 1] : null,
      symbols,
      curve: curveOf(trades),
      openCount: count,
      openCapital: capital,
    };
  });
}

export function computeBotAggs(tradeHistory: ClosedTrade[], botStats: Record<string, BotStat>): BotAgg[] {
  return BOT_DEFS.map((b) => {
    const trades = tradeHistory.filter(b.match);
    const wins = trades.filter((t) => t.pnl > 0).length;
    const net = trades.reduce((a, t) => a + t.pnl, 0);
    return {
      key: b.key,
      title: b.title,
      trades: trades.length,
      wins,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
      net,
      avg: trades.length ? net / trades.length : 0,
      recentNet: recentNetOf(trades),
      curve: curveOf(trades),
      edge: botStats[b.key]?.edge ?? 1,
    };
  }).filter((b) => b.trades > 0);
}

/** Coins/stocks where the engine has raised its caution multiplier above 1. */
export function computeCautioned(assetStats: Record<string, BotStat>): CautionEntry[] {
  return Object.entries(assetStats)
    .map(([symbol, stat]) => ({
      symbol,
      caution: assetCautionFromStat(stat),
      trades: stat.trades,
      winRate: stat.trades ? (stat.wins / stat.trades) * 100 : 0,
      net: stat.netPnl,
    }))
    .filter((e) => e.caution > 1)
    .sort((a, b) => b.caution - a.caution || a.net - b.net);
}

/* ── Rule-based Hebrew conclusions ──────────────────────────────────────────
 * Educational observations only. No advice, no win-rate/return promises. */
function buildConclusions(d: Omit<InsightsData, "conclusions">): string[] {
  const out: string[] = [];

  if (d.totalTrades === 0) {
    out.push("עדיין אין עסקאות סגורות לניתוח — הפעל את הבוטים וכשייסגרו עסקאות, כאן יופיעו תובנות מבוססות-חוקים על האפיקים והבוטים.");
    return out;
  }

  // Overall picture.
  out.push(
    `סך הכול ${d.totalTrades} עסקאות סגורות, ${d.overallWinRate.toFixed(0)}% מהן בירוק, רווח/הפסד מצטבר ${signed(d.totalNet)}.`,
  );

  // Strongest / weakest asset class.
  const active = d.classAggs.filter((c) => c.trades > 0);
  const ranked = [...active].sort((a, b) => b.net - a.net);
  if (ranked.length) {
    const best = ranked[0];
    out.push(
      `האפיק החזק ביותר עד כה: ${best.label} (${signed(best.net)} על ${best.trades} עסקאות, ${best.winRate.toFixed(0)}% הצלחה).`,
    );
    const worst = ranked[ranked.length - 1];
    if (ranked.length > 1 && worst.net < 0) {
      out.push(
        `האפיק שמתקשה ביותר: ${worst.label} (${signed(worst.net)}, ${worst.winRate.toFixed(0)}% הצלחה) — נצפתה חולשה יחסית, מקום לזהירות.`,
      );
    }
  }

  // Best / worst symbol across coins & stocks.
  if (d.bestSymbols.length && d.bestSymbols[0].net > 0) {
    const s = d.bestSymbols[0];
    out.push(`הנכס הבולט לטובה: ${s.symbol} (${signed(s.net)} על ${s.trades} עסקאות).`);
  }
  if (d.worstSymbols.length && d.worstSymbols[0].net < 0) {
    const s = d.worstSymbols[0];
    out.push(`הנכס המאתגר ביותר: ${s.symbol} (${signed(s.net)} על ${s.trades} עסקאות).`);
  }

  // Best / worst bot.
  const botsRanked = [...d.botAggs].sort((a, b) => b.net - a.net);
  if (botsRanked.length) {
    const bb = botsRanked[0];
    if (bb.net > 0) out.push(`הבוט המוביל: ${bb.title} (${signed(bb.net)}, ${bb.winRate.toFixed(0)}% הצלחה).`);
    const wb = botsRanked[botsRanked.length - 1];
    if (botsRanked.length > 1 && wb.net < 0) {
      out.push(`הבוט שמתקשה: ${wb.title} (${signed(wb.net)}, ${wb.winRate.toFixed(0)}% הצלחה).`);
    }
  }

  // Rising per-asset caution.
  if (d.cautioned.length) {
    const top = d.cautioned.slice(0, 4).map((c) => `${c.symbol} (×${c.caution.toFixed(2)})`).join(", ");
    out.push(`הסוכן מעלה זהירות על נכסים שחזרו להפסיד עליהם: ${top} — נדרש שם סטאפ חזק יותר לפני כניסה נוספת.`);
  }

  // Short-term trend.
  const recent = d.classAggs.reduce((a, c) => a + c.recentNet, 0);
  if (Math.abs(recent) > 0.5) {
    out.push(
      recent >= 0
        ? `המגמה האחרונה חיובית — העסקאות האחרונות הצטברו ל-${signed(recent)}.`
        : `המגמה האחרונה שלילית — העסקאות האחרונות הצטברו ל-${signed(recent)}; שלב טוב להגביר סלקטיביות.`,
    );
  }

  // Low overall win-rate note.
  if (d.totalTrades >= 10 && d.overallWinRate < 45) {
    out.push("אחוז ההצלחה הכולל נמוך מ-45% — מבחינה לימודית כדאי לבחון הידוק ספי כניסה והקטנת חשיפה.");
  }

  out.push("כל התובנות מבוססות-חוקים ולמטרות לימוד בלבד — אינן ייעוץ פיננסי ואינן הבטחה לתשואה.");
  return out;
}

/** Build the full insights dataset from history, open positions and scorecards. */
export function buildInsights(
  tradeHistory: ClosedTrade[],
  open: OpenPositions,
  assetStats: Record<string, BotStat>,
  botStats: Record<string, BotStat>,
): InsightsData {
  const totalTrades = tradeHistory.length;
  const totalWins = tradeHistory.filter((t) => t.pnl > 0).length;
  const totalNet = tradeHistory.reduce((a, t) => a + t.pnl, 0);
  const classAggs = computeClassAggs(tradeHistory, open);
  const botAggs = computeBotAggs(tradeHistory, botStats);
  const cautioned = computeCautioned(assetStats);
  const totalOpen =
    open.binance.length + open.stock.length + open.poly.length + open.funding.length + open.option.length;

  // Best/worst leaderboard across tradable coins, stocks and options.
  const tradableSymbols = computeSymbolAggs(
    tradeHistory.filter((t) => t.type === "BINANCE" || t.type === "STOCK" || t.type === "OPTION"),
  );
  const bestSymbols = [...tradableSymbols].sort((a, b) => b.net - a.net).slice(0, 5);
  const worstSymbols = [...tradableSymbols].sort((a, b) => a.net - b.net).slice(0, 5);

  const base: Omit<InsightsData, "conclusions"> = {
    totalTrades,
    totalWins,
    overallWinRate: totalTrades ? (totalWins / totalTrades) * 100 : 0,
    totalNet,
    totalOpen,
    classAggs,
    botAggs,
    bestSymbols,
    worstSymbols,
    cautioned,
  };

  return { ...base, conclusions: buildConclusions(base) };
}
