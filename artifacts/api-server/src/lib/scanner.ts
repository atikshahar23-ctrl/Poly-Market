import { fetchBinanceData, fetchAllBinanceData, ASSET_SYMBOLS, type BinanceData } from "./binance";
import { fetchPolymarketMarkets, type PolymarketMarket, type AssetFilter } from "./polymarket";

export type SignalType = "overbought_sentiment" | "underpriced_probability" | "neutral";
export type SignalSeverity = "low" | "medium" | "high";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type ActionType = "BUY_YES" | "BUY_NO" | "WATCH";

export interface ArbitrageSignal {
  type: SignalType;
  message: string;
  severity: SignalSeverity;
}

export interface MarketAnalysis {
  market: PolymarketMarket;
  distanceToTargetPercent: number;
  signal: ArbitrageSignal;
  binanceSymbol: string;
  markPrice: number;
}

export interface SignalCounts {
  overbought: number;
  underpriced: number;
  neutral: number;
}

export interface ScanResult {
  binanceAssets: BinanceData[];
  markets: MarketAnalysis[];
  scannedAt: string;
  totalMarkets: number;
  signalCounts: SignalCounts;
}

export interface Recommendation {
  rank: number;
  action: ActionType;
  rationale: string;
  market: PolymarketMarket;
  signal: ArbitrageSignal;
  binanceSymbol: string;
  markPrice: number;
  distanceToTargetPercent: number;
  confidence: ConfidenceLevel;
}

function classifySignal(
  distanceToTargetPercent: number,
  yesProbabilityPercent: number,
): ArbitrageSignal {
  if (distanceToTargetPercent > 10 && yesProbabilityPercent > 30) {
    const severity: SignalSeverity =
      distanceToTargetPercent > 25 && yesProbabilityPercent > 50
        ? "high"
        : distanceToTargetPercent > 15
          ? "medium"
          : "low";
    return {
      type: "overbought_sentiment",
      message: `Target is ${distanceToTargetPercent.toFixed(1)}% away but crowd assigns ${yesProbabilityPercent.toFixed(1)}% probability — crowd may be overconfident.`,
      severity,
    };
  }

  if (distanceToTargetPercent < 2 && yesProbabilityPercent < 10) {
    const severity: SignalSeverity =
      distanceToTargetPercent < 0.5 && yesProbabilityPercent < 5 ? "high" : "medium";
    return {
      type: "underpriced_probability",
      message: `Target is only ${distanceToTargetPercent.toFixed(1)}% away but crowd assigns just ${yesProbabilityPercent.toFixed(1)}% — market may be underpriced.`,
      severity,
    };
  }

  return {
    type: "neutral",
    message: `Distance ${distanceToTargetPercent.toFixed(1)}%, probability ${yesProbabilityPercent.toFixed(1)}% — no clear mispricing detected.`,
    severity: "low",
  };
}

/** Map a market's assetTag to the closest Binance mark price */
function resolveMarkPrice(assetTag: string, binanceAssets: BinanceData[]): BinanceData | undefined {
  const symbol = ASSET_SYMBOLS[assetTag];
  return symbol
    ? binanceAssets.find((b) => b.symbol === symbol)
    : binanceAssets.find((b) => b.symbol === "BTCUSDT");
}

function computeConfidence(signal: ArbitrageSignal, distanceToTargetPercent: number): ConfidenceLevel {
  if (signal.severity === "high") return "HIGH";
  if (signal.severity === "medium") return "MEDIUM";
  if (signal.type !== "neutral" && distanceToTargetPercent < 5) return "MEDIUM";
  return "LOW";
}

export async function runScan(opts: { asset?: AssetFilter; search?: string } = {}): Promise<ScanResult> {
  const { asset = "ALL" } = opts;

  const [binanceAssets, polymarkets] = await Promise.all([
    asset === "ALL"
      ? fetchAllBinanceData()
      : fetchBinanceData(ASSET_SYMBOLS[asset] ?? "BTCUSDT").then((d) => [d]),
    fetchPolymarketMarkets({ ...opts, requireTargetPrice: true, filterResolved: true }),
  ]);

  const analyzed: MarketAnalysis[] = [];

  for (const market of polymarkets) {
    const binanceEntry = resolveMarkPrice(market.assetTag, binanceAssets);
    if (!binanceEntry) continue;

    const distanceToTargetPercent = market.targetPrice != null
      ? ((market.targetPrice - binanceEntry.markPrice) / binanceEntry.markPrice) * 100
      : 0;

    const signal = classifySignal(Math.abs(distanceToTargetPercent), market.yesProbabilityPercent);

    analyzed.push({
      market,
      distanceToTargetPercent,
      signal,
      binanceSymbol: binanceEntry.symbol,
      markPrice: binanceEntry.markPrice,
    });
  }

  analyzed.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const diff = severityOrder[a.signal.severity] - severityOrder[b.signal.severity];
    if (diff !== 0) return diff;
    return Math.abs(a.distanceToTargetPercent) - Math.abs(b.distanceToTargetPercent);
  });

  const signalCounts = analyzed.reduce(
    (acc, m) => {
      if (m.signal.type === "overbought_sentiment") acc.overbought++;
      else if (m.signal.type === "underpriced_probability") acc.underpriced++;
      else acc.neutral++;
      return acc;
    },
    { overbought: 0, underpriced: 0, neutral: 0 },
  );

  return {
    binanceAssets,
    markets: analyzed,
    scannedAt: new Date().toISOString(),
    totalMarkets: analyzed.length,
    signalCounts,
  };
}

export async function buildRecommendations(): Promise<Recommendation[]> {
  const scan = await runScan({ asset: "ALL" });

  const actionable = scan.markets.filter((m) => m.signal.type !== "neutral");

  const recommendations: Recommendation[] = actionable.map((m, i) => {
    const action: ActionType =
      m.signal.type === "overbought_sentiment" ? "BUY_NO" : "BUY_YES";

    const rationale = m.signal.type === "overbought_sentiment"
      ? `Crowd assigns ${m.market.yesProbabilityPercent.toFixed(1)}% to a target ${Math.abs(m.distanceToTargetPercent).toFixed(1)}% away from the ${m.market.assetTag} mark price. Buying NO shares exploits this overconfidence.`
      : `Target is only ${Math.abs(m.distanceToTargetPercent).toFixed(1)}% from current ${m.market.assetTag} price but the crowd only gives ${m.market.yesProbabilityPercent.toFixed(1)}% probability. YES shares appear underpriced.`;

    return {
      rank: i + 1,
      action,
      rationale,
      market: m.market,
      signal: m.signal,
      binanceSymbol: m.binanceSymbol,
      markPrice: m.markPrice,
      distanceToTargetPercent: m.distanceToTargetPercent,
      confidence: computeConfidence(m.signal, Math.abs(m.distanceToTargetPercent)),
    };
  });

  // Final rank: HIGH confidence first, then by severity
  const confidenceOrder: Record<ConfidenceLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  recommendations.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);
  recommendations.forEach((r, i) => { r.rank = i + 1; });

  return recommendations.slice(0, 20);
}
