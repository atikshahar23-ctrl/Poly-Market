import { logger } from "./logger";

export interface PolymarketMarket {
  conditionId: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  yesProbabilityPercent: number;
  targetPrice: number | null;
  active: boolean;
  endDate: string | null;
  volume: number | null;
  assetTag: string;
}

const POLYMARKET_API = "https://clob.polymarket.com/markets";

export type AssetFilter = "BTC" | "ETH" | "SOL" | "BNB" | "ALL";

const ASSET_KEYWORDS: Record<AssetFilter, string[]> = {
  BTC: ["Bitcoin", "BTC"],
  ETH: ["Ethereum", "ETH"],
  SOL: ["Solana", "SOL"],
  BNB: ["BNB", "Binance Coin"],
  ALL: ["Bitcoin", "BTC", "Ethereum", "ETH", "Solana", "SOL", "BNB", "Binance Coin"],
};

/** Detect which asset tag applies to a question */
function detectAssetTag(question: string): string {
  if (/bitcoin|btc/i.test(question)) return "BTC";
  if (/ethereum|eth/i.test(question)) return "ETH";
  if (/solana|\bsol\b/i.test(question)) return "SOL";
  if (/\bbnb\b|binance coin/i.test(question)) return "BNB";
  return "CRYPTO";
}

/** Extract a dollar target price from a contract question using regex */
function extractTargetPrice(question: string): number | null {
  // Matches $100,000 or $65k or $65K or $1.5k
  const match = /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?[kK])/.exec(question);
  if (!match) return null;

  const raw = match[1].replace(/,/g, "").toLowerCase();
  if (raw.endsWith("k")) {
    return parseFloat(raw.slice(0, -1)) * 1000;
  }
  return parseFloat(raw);
}

export interface FetchPolymarketOptions {
  asset?: AssetFilter;
  search?: string;
}

export async function fetchPolymarketMarkets(opts: FetchPolymarketOptions = {}): Promise<PolymarketMarket[]> {
  const { asset = "ALL", search } = opts;
  const keywords = ASSET_KEYWORDS[asset];

  const url = `${POLYMARKET_API}?active=true&limit=200`;
  const response = await fetch(url);

  if (!response.ok) {
    logger.error({ status: response.status }, "Polymarket API error");
    throw new Error(`Polymarket API returned ${response.status}`);
  }

  const json = await response.json() as Record<string, unknown>;
  const rawMarkets = (json["data"] ?? json) as Record<string, unknown>[];

  const markets: PolymarketMarket[] = [];

  for (const market of rawMarkets) {
    const question = (market["question"] as string) ?? "";

    // Match any of the keywords for the selected asset(s)
    const matchesAsset = keywords.some((kw) =>
      question.toLowerCase().includes(kw.toLowerCase()),
    );
    if (!matchesAsset) continue;

    // Apply optional text search
    if (search && !question.toLowerCase().includes(search.toLowerCase())) continue;

    const tokens = (market["tokens"] as Record<string, unknown>[]) ?? [];
    if (tokens.length < 2) continue;

    const yesPrice = parseFloat((tokens[0]["price"] as string) ?? "0");
    const noPrice = parseFloat((tokens[1]["price"] as string) ?? "0");
    const yesProbabilityPercent = yesPrice * 100;

    // Filter out near-resolved markets
    if (yesPrice <= 0.01 || yesPrice >= 0.99) continue;

    const targetPrice = extractTargetPrice(question);
    if (!targetPrice) continue;

    markets.push({
      conditionId: (market["condition_id"] as string) ?? (market["conditionId"] as string) ?? "",
      question,
      yesPrice,
      noPrice,
      yesProbabilityPercent,
      targetPrice,
      active: (market["active"] as boolean) ?? true,
      endDate: (market["end_date_iso"] as string) ?? (market["endDate"] as string) ?? null,
      volume: market["volume"] != null ? parseFloat(market["volume"] as string) : null,
      assetTag: detectAssetTag(question),
    });
  }

  return markets;
}
