import { useEffect } from "react";
import {
  useGetBinanceFuturesStatus,
  useGetBinanceFuturesPositions,
  getGetBinanceFuturesStatusQueryKey,
  getGetBinanceFuturesPositionsQueryKey,
} from "@workspace/api-client-react";
import { liveFuturesState } from "@/lib/live-futures";

/**
 * Bridges the backend live-trading status into the module singleton that the
 * (non-React) portfolio bridge reads, and runs the 60s position sync.
 *
 * Mounted once inside the Auto-Trader engine so it lives for the whole authed
 * session alongside the bot loops.
 */
export function useLiveFutures() {
  const { data: status } = useGetBinanceFuturesStatus({
    query: {
      queryKey: getGetBinanceFuturesStatusQueryKey(),
      refetchInterval: 30_000,
    },
  });

  const mode = status?.liveMode ?? "testnet";
  const env = status ? status[mode] : undefined;
  const liveActive = Boolean(env?.connected && env?.liveTradingEnabled);

  // Keep the singleton in sync so portfolio-context can gate live orders.
  useEffect(() => {
    liveFuturesState.liveActive = liveActive;
    liveFuturesState.mode = mode;
  }, [liveActive, mode]);

  // 60s reconciliation poll — only while live trading is armed.
  useGetBinanceFuturesPositions({
    query: {
      queryKey: getGetBinanceFuturesPositionsQueryKey(),
      enabled: liveActive,
      refetchInterval: liveActive ? 60_000 : false,
    },
  });

  return { liveActive, mode, status };
}
