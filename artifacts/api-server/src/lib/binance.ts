import { logger } from "./logger";

export interface BinanceData {
  symbol: string;
  asset: string;
  markPrice: number;
  fundingRate: number;
  fundingRatePercent: number;
  fetchedAt: string;
}

const BINANCE_FUTURES_API = "https://fapi.binance.com/fapi/v1/premiumIndex";

export const ASSET_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
};

export const ALL_SYMBOLS = Object.entries(ASSET_SYMBOLS);

export async function fetchBinanceData(symbol = "BTCUSDT"): Promise<BinanceData> {
  const url = new URL(BINANCE_FUTURES_API);
  url.searchParams.set("symbol", symbol);

  const response = await fetch(url.toString());
  if (!response.ok) {
    logger.error({ status: response.status, symbol }, "Binance API error");
    throw new Error(`Binance API returned ${response.status} for ${symbol}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const markPrice = parseFloat(data["markPrice"] as string);
  const lastFundingRate = parseFloat(data["lastFundingRate"] as string);
  const asset = symbol.replace("USDT", "");

  return {
    symbol,
    asset,
    markPrice,
    fundingRate: lastFundingRate,
    fundingRatePercent: lastFundingRate * 100,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchAllBinanceData(): Promise<BinanceData[]> {
  const results = await Promise.allSettled(
    ALL_SYMBOLS.map(([, symbol]) => fetchBinanceData(symbol)),
  );

  const successful: BinanceData[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      successful.push(result.value);
    } else {
      logger.warn({ reason: result.reason }, "Failed to fetch Binance asset");
    }
  }
  return successful;
}
