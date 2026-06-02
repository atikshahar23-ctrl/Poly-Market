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

// Patterns use word boundaries (\b) for short tickers to avoid false positives
// e.g. "ETH" would match "FiveThirtyEight" without \b
const ASSET_PATTERNS: Record<AssetFilter, RegExp> = {
  BTC: /bitcoin|\bbtc\b/i,
  ETH: /ethereum|\beth\b/i,
  SOL: /solana|\bsol\b/i,
  BNB: /\bbnb\b|binance coin/i,
  ALL: /bitcoin|\bbtc\b|ethereum|\beth\b|solana|\bsol\b|\bbnb\b|binance coin/i,
};

/** Detect which asset tag applies to a question */
function detectAssetTag(question: string): string {
  if (/bitcoin|\bbtc\b/i.test(question)) return "BTC";
  if (/ethereum|\beth\b/i.test(question)) return "ETH";
  if (/solana|\bsol\b/i.test(question)) return "SOL";
  if (/\bbnb\b|binance coin/i.test(question)) return "BNB";
  return "CRYPTO";
}

/** Extract a dollar target price from a contract question using regex */
export function extractTargetPrice(question: string): number | null {
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
  /** If true, only returns markets that have an extractable dollar target price */
  requireTargetPrice?: boolean;
  /** If true, filters out near-resolved markets (yes < 1% or yes > 99%) */
  filterResolved?: boolean;
}

/** Fetch all pages from Polymarket, following next_cursor pagination */
async function fetchAllPages(): Promise<Record<string, unknown>[]> {
  const PAGE_SIZE = 500;
  const all: Record<string, unknown>[] = [];
  let cursor: string | undefined = undefined;
  let page = 0;
  const MAX_PAGES = 6; // safety cap — ~3000 markets max

  do {
    const url = new URL(POLYMARKET_API);
    url.searchParams.set("active", "true");
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (cursor) url.searchParams.set("next_cursor", cursor);

    const response = await fetch(url.toString());
    if (!response.ok) {
      logger.error({ status: response.status, page }, "Polymarket API error");
      throw new Error(`Polymarket API returned ${response.status}`);
    }

    const json = await response.json() as Record<string, unknown>;

    // Support both envelope format ({ data: [...], next_cursor }) and raw array
    const items = (json["data"] ?? json) as Record<string, unknown>[];
    all.push(...items);

    const next = json["next_cursor"] as string | undefined;
    // Stop if there's no next cursor or it's "LTE=" (Polymarket's end-of-list sentinel)
    cursor = next && next !== "LTE=" ? next : undefined;
    page++;
  } while (cursor && page < MAX_PAGES);

  logger.info({ total: all.length, pages: page }, "Polymarket pages fetched");
  return all;
}

export async function fetchPolymarketMarkets(opts: FetchPolymarketOptions = {}): Promise<PolymarketMarket[]> {
  const {
    asset = "ALL",
    search,
    requireTargetPrice = false,
    filterResolved = false,
  } = opts;

  const pattern = ASSET_PATTERNS[asset];
  const rawMarkets = await fetchAllPages();

  const markets: PolymarketMarket[] = [];

  for (const market of rawMarkets) {
    const question = (market["question"] as string) ?? "";

    if (!pattern.test(question)) continue;

    // Apply optional text search
    if (search && !question.toLowerCase().includes(search.toLowerCase())) continue;

    const tokens = (market["tokens"] as Record<string, unknown>[]) ?? [];
    if (tokens.length < 2) continue;

    const yesPrice = parseFloat((tokens[0]["price"] as string) ?? "0");
    const noPrice = parseFloat((tokens[1]["price"] as string) ?? "0");
    const yesProbabilityPercent = yesPrice * 100;

    // Optionally filter out near-resolved markets
    if (filterResolved && (yesPrice <= 0.01 || yesPrice >= 0.99)) continue;

    const targetPrice = extractTargetPrice(question);

    // Only skip if caller explicitly requires a target price
    if (requireTargetPrice && !targetPrice) continue;

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
