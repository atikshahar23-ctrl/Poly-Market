import {
  placeBinanceFuturesOrder,
  closeBinanceFuturesOrder,
  closeAllBinanceFutures,
} from "@workspace/api-client-react";

/**
 * Decoupled live-trading bridge.
 *
 * The portfolio context (which is sync and provider-level) needs to know whether
 * live trading is active without importing a React-Query hook. The `useLiveFutures`
 * hook keeps this module-level singleton in sync with the backend status, and the
 * helper functions below fire the real Binance Futures orders.
 *
 * Only bot (auto) positions ever reach these — manual UI trades never do.
 */
export interface LiveFuturesRuntime {
  /** True only when the active mode has validated creds AND liveTradingEnabled. */
  liveActive: boolean;
  mode: "testnet" | "mainnet";
}

export const liveFuturesState: LiveFuturesRuntime = { liveActive: false, mode: "testnet" };

/** Mirror a bot open to a real Binance Futures market order. Throws on rejection. */
export async function liveOpenOrder(args: {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  leverage: number;
}): Promise<{ orderId: string; fillPrice: number; fillQty: number }> {
  return placeBinanceFuturesOrder({
    symbol: args.symbol,
    side: args.side,
    quantity: args.quantity,
    leverage: args.leverage,
  });
}

/** Market-close the live position for a symbol. Throws if Binance errors. */
export async function liveCloseOrder(symbol: string): Promise<void> {
  await closeBinanceFuturesOrder({ symbol });
}

/** Emergency: cancel all open orders + market-close every live position. */
export async function liveCloseAllOrders(): Promise<void> {
  await closeAllBinanceFutures();
}
