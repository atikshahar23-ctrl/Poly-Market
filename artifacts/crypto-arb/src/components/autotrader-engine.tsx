import { useEffect, useRef } from "react";
import {
  useGetScalpSignals, getGetScalpSignalsQueryKey,
  useGetMomentumCoins, getGetMomentumCoinsQueryKey,
  useGetMarketOverview, getGetMarketOverviewQueryKey,
  useGetStocks, getGetStocksQueryKey,
} from "@workspace/api-client-react";
import type { ScalpSignal, MomentumCoin } from "@workspace/api-client-react";
import { usePortfolio, type TrailConfig } from "@/contexts/portfolio-context";
import { useAutoTrader, type ScalpConfidence } from "@/contexts/autotrader-context";
import { useFavorites } from "@/contexts/favorites-context";
import { toast } from "@/hooks/use-toast";

const CONF_RANK: Record<ScalpConfidence, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
/** Don't re-open the same asset within this window after an auto action. */
const COOLDOWN_MS = 10 * 60 * 1000;

/** Normalized trade candidate from any signal source. */
interface Candidate {
  asset: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  score: number;
  source: string;
  label: string;
}

/** Sum realized PnL from trades closed today (local time). */
function realizedPnlToday(history: { pnl: number; closedAt: string }[]): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  let sum = 0;
  for (const t of history) {
    const ts = new Date(t.closedAt).getTime();
    if (ts >= startMs) sum += t.pnl;
  }
  return sum;
}

/**
 * Headless engine mounted once under the providers. It (1) trails + runs SL/TP
 * across all open Binance demo positions using live prices, and (2) opens new
 * auto-trades from scalp + momentum signals at a "warrior" cadence when armed.
 */
export function AutoTraderEngine() {
  const {
    binancePositions, cash, totalDeposited, tradeHistory,
    openBinancePosition, checkSlTp, updateTrailingStops,
  } = usePortfolio();
  const { settings } = useAutoTrader();
  const { isFavorite } = useFavorites();

  const { data: overview } = useGetMarketOverview({
    query: { queryKey: getGetMarketOverviewQueryKey(), refetchInterval: 30000, staleTime: 20000 },
  });
  const { data: stocks } = useGetStocks({
    query: { queryKey: getGetStocksQueryKey(), refetchInterval: 30000, staleTime: 20000 },
  });

  const useScalp = settings.strategy === "SCALP" || settings.strategy === "BOTH";
  const useMomentum = settings.strategy === "MOMENTUM" || settings.strategy === "BOTH";

  const { data: signals } = useGetScalpSignals({
    query: {
      queryKey: getGetScalpSignalsQueryKey(),
      refetchInterval: settings.enabled && useScalp ? 60000 : false,
      staleTime: 45000,
      enabled: settings.enabled && useScalp,
    },
  });
  const { data: momentum } = useGetMomentumCoins({
    query: {
      queryKey: getGetMomentumCoinsQueryKey(),
      refetchInterval: settings.enabled && useMomentum ? 60000 : false,
      staleTime: 45000,
      enabled: settings.enabled && useMomentum,
    },
  });

  const cooldownRef = useRef<Record<string, number>>({});

  // Build a live price map (crypto + stocks); trail first, then SL/TP exits.
  const priceMap: Record<string, number> = {};
  for (const c of overview ?? []) priceMap[c.asset] = c.price;
  for (const s of stocks ?? []) priceMap[s.symbol] = s.price;

  useEffect(() => {
    if (Object.keys(priceMap).length === 0) return;
    updateTrailingStops(priceMap);
    checkSlTp(priceMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview, stocks, checkSlTp, updateTrailingStops]);

  // Auto-trade evaluation.
  useEffect(() => {
    if (!settings.enabled) return;
    const margin = settings.marginPerTrade;
    if (!(margin > 0) || !(settings.leverage >= 1)) return;

    // Daily loss guard — stop opening once today's realized loss hits the cap.
    if (settings.dailyStopEnabled) {
      const cap = (settings.dailyMaxLossPct / 100) * totalDeposited;
      if (cap > 0 && realizedPnlToday(tradeHistory) <= -cap) return;
    }

    const now = Date.now();
    let autoOpen = binancePositions.filter((p) => p.auto).length;
    let availableCash = cash;
    const openAssets = new Set(binancePositions.map((p) => p.asset));

    // ── Collect candidates from enabled sources ──
    const candidates: Candidate[] = [];

    if (useScalp && signals) {
      for (const s of signals as ScalpSignal[]) {
        if (s.direction === "NEUTRAL") continue;
        if (CONF_RANK[s.confidence] < CONF_RANK[settings.minConfidence]) continue;
        if (s.direction === "LONG" ? !settings.allowLong : !settings.allowShort) continue;
        if (!Number.isFinite(s.entry) || s.entry <= 0) continue;
        candidates.push({
          asset: s.asset,
          direction: s.direction as "LONG" | "SHORT",
          entry: s.entry,
          stopLoss: s.stopLoss,
          takeProfit: s.takeProfit,
          score: s.score,
          source: "Scalp signal",
          label: `${s.confidence} scalp`,
        });
      }
    }

    if (useMomentum && momentum && settings.allowLong) {
      for (const m of momentum as MomentumCoin[]) {
        if (m.score < settings.minMomentumScore) continue;
        if (m.stage === "COOLING") continue;
        if (!Number.isFinite(m.entry) || m.entry <= 0) continue;
        candidates.push({
          asset: m.asset,
          direction: "LONG", // momentum runners are long-biased
          entry: m.entry,
          stopLoss: m.stopLoss,
          takeProfit: m.takeProfit,
          score: m.score,
          source: "Momentum surge",
          label: `${m.stage.toLowerCase()} · ${m.rvol.toFixed(1)}× vol`,
        });
      }
    }

    // De-dupe by asset (keep the highest score), apply gates, rank.
    const byAsset = new Map<string, Candidate>();
    for (const c of candidates) {
      const existing = byAsset.get(c.asset);
      if (!existing || c.score > existing.score) byAsset.set(c.asset, c);
    }

    const ranked = [...byAsset.values()]
      .filter((c) => !settings.favoritesOnly || isFavorite(`coin:${c.asset}`))
      .filter((c) => !openAssets.has(c.asset))
      .filter((c) => now - (cooldownRef.current[c.asset] ?? 0) > COOLDOWN_MS)
      .sort((a, b) => b.score - a.score);

    const trail: TrailConfig | undefined = settings.trailingEnabled
      ? { activatePct: settings.trailActivatePct, distancePct: settings.trailDistancePct }
      : undefined;

    for (const c of ranked) {
      if (autoOpen >= settings.maxOpenPositions) break;
      if (availableCash < margin) break;

      const notional = margin * settings.leverage;
      const err = openBinancePosition({
        asset: c.asset,
        direction: c.direction,
        notional,
        entryPrice: c.entry,
        leverage: settings.leverage,
        slPrice: c.stopLoss,
        tpPrice: c.takeProfit,
        auto: true,
        source: c.source,
        trail,
      });
      if (err) continue;

      cooldownRef.current[c.asset] = now;
      availableCash -= margin;
      autoOpen += 1;
      toast({
        title: `Auto-Trade · ${c.direction} ${c.asset}`,
        description: `${c.source} (${c.label}) · ${settings.leverage}x · $${margin} @ $${c.entry}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals, momentum, settings, cash, binancePositions, isFavorite, totalDeposited, tradeHistory]);

  return null;
}
