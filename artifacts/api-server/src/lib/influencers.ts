import { logger } from "./logger";

/**
 * Smart-Money influencer signals.
 *
 * Free, no-key pipeline: for each mega-influencer we query Google News RSS,
 * score the recent headlines with a keyword sentiment model, and map the
 * result onto the tickers that influencer tends to move. Direction is derived
 * from sentiment sign (LONG on positive, SHORT on negative). Everything is
 * advisory only — this drives paper trades, never real orders.
 */

export interface InfluencerSignal {
  influencer: string;
  ticker: string;
  name: string;
  headline: string;
  url: string;
  source: string;
  sentiment: number; // -1..1
  direction: "LONG" | "SHORT";
  confidence: number; // 0..100
  horizon: "SHORT" | "LONG";
  publishedAt: string;
}

interface TickerRef {
  ticker: string;
  name: string;
  /** Extra match terms (besides ticker + name) used to attribute headlines. */
  terms?: string[];
}

interface InfluencerDef {
  name: string;
  /** Google News search query. */
  query: string;
  tickers: TickerRef[];
}

const INFLUENCERS: InfluencerDef[] = [
  {
    name: "Donald Trump",
    query: "Donald Trump",
    tickers: [
      { ticker: "DJT", name: "Trump Media", terms: ["truth social", "djt"] },
      { ticker: "LMT", name: "Lockheed Martin", terms: ["defense", "military", "lockheed"] },
      { ticker: "XOM", name: "ExxonMobil", terms: ["oil", "energy", "drilling", "exxon"] },
    ],
  },
  {
    name: "Elon Musk",
    query: "Elon Musk",
    tickers: [
      { ticker: "TSLA", name: "Tesla", terms: ["tesla", "cybertruck", "robotaxi"] },
    ],
  },
  {
    name: "Cathie Wood",
    query: "Cathie Wood ARK Invest",
    tickers: [
      { ticker: "COIN", name: "Coinbase", terms: ["coinbase", "crypto exchange"] },
      { ticker: "TSLA", name: "Tesla", terms: ["tesla"] },
    ],
  },
  {
    name: "Warren Buffett",
    query: "Warren Buffett Berkshire",
    tickers: [
      { ticker: "AAPL", name: "Apple", terms: ["apple"] },
      { ticker: "BRK-B", name: "Berkshire Hathaway", terms: ["berkshire"] },
    ],
  },
  {
    name: "Jerome Powell",
    query: "Jerome Powell Federal Reserve interest rates",
    tickers: [
      { ticker: "SPY", name: "S&P 500 ETF", terms: ["s&p", "stocks", "market", "wall street"] },
      { ticker: "QQQ", name: "Nasdaq 100 ETF", terms: ["nasdaq", "tech stocks"] },
    ],
  },
  {
    name: "Nancy Pelosi",
    query: "Nancy Pelosi stock trades",
    tickers: [
      { ticker: "NVDA", name: "Nvidia", terms: ["nvidia"] },
      { ticker: "QQQ", name: "Nasdaq 100 ETF", terms: ["nasdaq", "tech"] },
    ],
  },
];

const POSITIVE = [
  "surge", "soar", "jump", "rally", "beat", "beats", "gain", "gains", "boost",
  "boosts", "win", "wins", "approve", "approved", "approval", "bullish", "record",
  "deal", "support", "supports", "praise", "praises", "upgrade", "upgraded", "rise",
  "rises", "climb", "climbs", "high", "highs", "strong", "growth", "profit", "profits",
  "buy", "optimism", "expand", "expands", "soars",
];
const NEGATIVE = [
  "plunge", "plunges", "drop", "drops", "fall", "falls", "slump", "crash", "crashes",
  "miss", "misses", "ban", "bans", "lawsuit", "probe", "sue", "sues", "tariff",
  "tariffs", "sanction", "sanctions", "bearish", "cut", "cuts", "layoff", "layoffs",
  "warn", "warns", "warning", "threat", "threatens", "attack", "attacks", "criticize",
  "criticizes", "slam", "slams", "fraud", "downgrade", "downgraded", "loss", "losses",
  "weak", "decline", "declines", "sink", "sinks", "fear", "fears", "recession", "sell-off",
  "selloff", "tumble", "tumbles",
];

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

interface RawHeadline {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

async function fetchHeadlines(query: string): Promise<RawHeadline[]> {
  const q = encodeURIComponent(`${query} stock OR shares OR market when:3d`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (HeavyGuard)" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const out: RawHeadline[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null && out.length < 20) {
      const block = match[1] ?? "";
      const titleRaw = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? "";
      const linkRaw = /<link>([\s\S]*?)<\/link>/.exec(block)?.[1] ?? "";
      const pubRaw = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ?? "";
      const sourceRaw = /<source[^>]*>([\s\S]*?)<\/source>/.exec(block)?.[1] ?? "";

      const title = decodeEntities(titleRaw.replace(/<!\[CDATA\[|\]\]>/g, "").trim());
      const link = linkRaw.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      if (!title || !link) continue;

      const cleanTitle = title.replace(/\s+-\s+[^-]+$/, "").trim() || title;
      const source = decodeEntities(sourceRaw.replace(/<!\[CDATA\[|\]\]>/g, "").trim()) || "News";
      out.push({
        title: cleanTitle,
        url: link,
        source,
        publishedAt: pubRaw ? new Date(pubRaw).toISOString() : new Date().toISOString(),
      });
    }
    return out;
  } catch (err) {
    logger.warn({ err, query }, "Influencer news fetch failed");
    return [];
  }
}

/** Word-boundary keyword count so "ban" doesn't match "urban". */
function countMatches(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) n++;
  }
  return n;
}

/** Headline sentiment in -1..1 plus the raw magnitude (keyword hits). */
function scoreHeadline(text: string): { sentiment: number; magnitude: number } {
  const pos = countMatches(text, POSITIVE);
  const neg = countMatches(text, NEGATIVE);
  const raw = pos - neg;
  const magnitude = pos + neg;
  const sentiment = Math.max(-1, Math.min(1, raw / 3));
  return { sentiment, magnitude };
}

function buildSignals(influencer: InfluencerDef, headlines: RawHeadline[]): InfluencerSignal[] {
  if (headlines.length === 0) return [];

  // Pre-score every headline once.
  const scored = headlines.map((h) => ({ h, ...scoreHeadline(h.title) }));

  const signals: InfluencerSignal[] = [];
  for (const ref of influencer.tickers) {
    const matchTerms = [ref.ticker.toLowerCase(), ref.name.toLowerCase(), ...(ref.terms ?? [])];

    // Prefer headlines that actually mention this ticker / company / theme.
    const matched = scored.filter((s) =>
      matchTerms.some((t) => s.h.title.toLowerCase().includes(t)),
    );
    const pool = matched.length > 0 ? matched : scored;

    // Aggregate sentiment, weighting toward stronger headlines.
    const totalMag = pool.reduce((sum, s) => sum + s.magnitude, 0);
    const avgSentiment =
      totalMag > 0
        ? pool.reduce((sum, s) => sum + s.sentiment * s.magnitude, 0) / totalMag
        : pool.reduce((sum, s) => sum + s.sentiment, 0) / pool.length;

    // Skip flat/no-signal tickers when we had no direct mention.
    if (matched.length === 0 && Math.abs(avgSentiment) < 0.1) continue;

    // Representative headline = strongest magnitude in the pool.
    const rep = [...pool].sort((a, b) => b.magnitude - a.magnitude)[0]!;

    const direction: "LONG" | "SHORT" = avgSentiment >= 0 ? "LONG" : "SHORT";
    const strength = Math.abs(avgSentiment); // 0..1
    const coverageBoost = Math.min(matched.length, 4) * 4; // more matching news = more conviction
    const confidence = Math.round(Math.min(95, 35 + strength * 45 + coverageBoost));

    signals.push({
      influencer: influencer.name,
      ticker: ref.ticker,
      name: ref.name,
      headline: rep.h.title,
      url: rep.h.url,
      source: rep.h.source,
      sentiment: Number(avgSentiment.toFixed(3)),
      direction,
      confidence,
      horizon: "SHORT",
      publishedAt: rep.h.publishedAt,
    });
  }
  return signals;
}

let cache: { data: InfluencerSignal[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchInfluencerSignals(): Promise<InfluencerSignal[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.data;

  const results = await Promise.all(
    INFLUENCERS.map(async (inf) => buildSignals(inf, await fetchHeadlines(inf.query))),
  );

  const signals = results
    .flat()
    .sort((a, b) => b.confidence - a.confidence || +new Date(b.publishedAt) - +new Date(a.publishedAt));

  cache = { data: signals, expiresAt: Date.now() + CACHE_TTL_MS };
  return signals;
}
