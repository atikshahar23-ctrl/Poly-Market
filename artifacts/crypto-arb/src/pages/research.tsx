import { useMemo, useState } from "react";
import {
  useGetStockSearch, getGetStockSearchQueryKey,
  useGetMarketOverview, getGetMarketOverviewQueryKey,
  useGetStocks, getGetStocksQueryKey,
  useGetInfluencerSignals, getGetInfluencerSignalsQueryKey,
} from "@workspace/api-client-react";
import type { CoinTicker, StockQuote, InfluencerSignal } from "@workspace/api-client-react";
import {
  Search, ExternalLink, TrendingUp, TrendingDown, Newspaper, LineChart,
  BarChart3, FileText, Coins, Building2, Megaphone, Globe, Gauge,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toPrecision(3);
}

interface ResearchLink { label: string; href: string; icon: React.ComponentType<{ className?: string }>; }

function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "#";
}

function stockLinks(symbol: string, name: string): ResearchLink[] {
  const q = encodeURIComponent(`${symbol} ${name} stock`);
  const tvSymbol = symbol.replace(/-/g, ".");
  return [
    { label: "TradingView", href: `https://www.tradingview.com/symbols/${tvSymbol}/`, icon: LineChart },
    { label: "Yahoo Finance", href: `https://finance.yahoo.com/quote/${symbol}`, icon: BarChart3 },
    { label: "StockAnalysis", href: `https://stockanalysis.com/stocks/${symbol}/`, icon: FileText },
    { label: "חדשות", href: `https://news.google.com/search?q=${q}`, icon: Newspaper },
    { label: "דוחות SEC", href: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(name)}&type=10-K`, icon: Building2 },
  ];
}

function cryptoLinks(asset: string, symbol: string): ResearchLink[] {
  const q = encodeURIComponent(`${asset} crypto`);
  return [
    { label: "TradingView", href: `https://www.tradingview.com/symbols/${symbol.replace(/USDT$/, "USD")}/`, icon: LineChart },
    { label: "CoinGecko", href: `https://www.coingecko.com/en/search?query=${encodeURIComponent(asset)}`, icon: Coins },
    { label: "חדשות", href: `https://news.google.com/search?q=${q}`, icon: Newspaper },
  ];
}

const QUICK_LINKS: ResearchLink[] = [
  { label: "חדשות שוק", href: "https://news.google.com/search?q=stock%20market%20today", icon: Newspaper },
  { label: "TradingView", href: "https://www.tradingview.com/markets/", icon: LineChart },
  { label: "CoinGecko", href: "https://www.coingecko.com/", icon: Coins },
  { label: "Fear & Greed", href: "https://alternative.me/crypto/fear-and-greed-index/", icon: Gauge },
  { label: "כלכלה עולמית", href: "https://news.google.com/search?q=crypto%20bitcoin", icon: Globe },
];

function LinkPills({ links }: { links: ResearchLink[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground/90 hover:border-primary/60 hover:text-primary transition-colors focus-visible:text-primary"
        >
          <l.icon className="h-3.5 w-3.5" />
          {l.label}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
      ))}
    </div>
  );
}

export default function Research() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const submitted = query.trim().length >= 1;
  const Q = query.trim().toUpperCase();

  const { data: searchResults, isFetching: searching } = useGetStockSearch(
    { q: query.trim() },
    { query: { queryKey: getGetStockSearchQueryKey({ q: query.trim() }), enabled: submitted, staleTime: 60000 } },
  );
  const { data: overview } = useGetMarketOverview({
    query: { queryKey: getGetMarketOverviewQueryKey(), refetchInterval: 30000, staleTime: 20000 },
  });
  const { data: stocks } = useGetStocks({
    query: { queryKey: getGetStocksQueryKey(), refetchInterval: 30000, staleTime: 20000 },
  });
  const { data: influencers } = useGetInfluencerSignals({
    query: { queryKey: getGetInfluencerSignalsQueryKey(), refetchInterval: 120000, staleTime: 60000 },
  });

  const cryptoMatches = useMemo<CoinTicker[]>(() => {
    if (!submitted) return [];
    return ((overview ?? []) as CoinTicker[])
      .filter((c) => c.asset.toUpperCase().includes(Q) || c.symbol.toUpperCase().includes(Q))
      .slice(0, 6);
  }, [overview, Q, submitted]);

  const quoteFor = (symbol: string): StockQuote | undefined =>
    ((stocks ?? []) as StockQuote[]).find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());

  const relatedNews = useMemo<InfluencerSignal[]>(() => {
    if (!submitted) return [];
    return ((influencers ?? []) as InfluencerSignal[])
      .filter((i) => i.ticker.toUpperCase().includes(Q) || i.name.toUpperCase().includes(Q))
      .slice(0, 5);
  }, [influencers, Q, submitted]);

  const stockHits = (searchResults ?? []).slice(0, 8);
  const noResults = submitted && !searching && stockHits.length === 0 && cryptoMatches.length === 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <header className="md:pr-44">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" /> Research Desk
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5" dir="rtl">
          חיפוש מידע על מניות וקריפטו — מחירים חיים, גרפים, חדשות ודוחות. כל המקורות חינמיים.
        </p>
      </header>

      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); setQuery(draft); }}
        className="flex gap-2"
        role="search"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="חפש סימבול או שם חברה — לדוגמה NVDA, Tesla, BTC"
            className="pl-9 h-11 bg-secondary/40 text-sm"
            aria-label="Search symbol or company"
            autoFocus
          />
        </div>
        <Button type="submit" className="h-11 px-5 gap-2 font-medium">
          <Search className="h-4 w-4" /> חפש
        </Button>
      </form>

      {/* Quick research links (always available) */}
      {!submitted && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">קישורים מהירים</h2>
          <LinkPills links={QUICK_LINKS} />
          <div className="rounded-lg border border-border bg-secondary/20 p-5 text-center">
            <Search className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-2" dir="rtl">
              הקלד סימבול או שם חברה כדי לקבל מחיר חי, גרפים, חדשות ודוחות.
            </p>
          </div>
        </section>
      )}

      {noResults && (
        <div className="rounded-lg border border-border bg-secondary/20 p-6 text-center">
          <p className="text-sm text-muted-foreground" dir="rtl">
            לא נמצאו תוצאות עבור "{query}". נסה סימבול אחר (למשל AAPL) או חיפוש כללי בקישורים המהירים.
          </p>
          <div className="mt-3 flex justify-center"><LinkPills links={QUICK_LINKS} /></div>
        </div>
      )}

      {/* Crypto matches */}
      {cryptoMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Coins className="h-3.5 w-3.5" /> קריפטו
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cryptoMatches.map((c) => {
              const up = c.changePercent >= 0;
              return (
                <div key={c.symbol} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-bold">{c.asset}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{c.symbol}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold">${fmtPrice(c.price)}</div>
                      <div className={`text-xs font-mono flex items-center gap-1 justify-end ${up ? "text-emerald-400" : "text-red-400"}`}>
                        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {up ? "+" : ""}{c.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <LinkPills links={cryptoLinks(c.asset, c.symbol)} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Stock matches */}
      {stockHits.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <LineChart className="h-3.5 w-3.5" /> מניות
          </h2>
          <div className="space-y-3">
            {stockHits.map((s) => {
              const quote = quoteFor(s.symbol);
              const up = quote ? quote.changePercent >= 0 : false;
              return (
                <div key={`${s.symbol}-${s.exchange}`} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold">{s.symbol}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground uppercase">{s.type}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{s.exchange}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{s.name}</div>
                    </div>
                    {quote && (
                      <div className="text-right shrink-0">
                        <div className="font-mono font-semibold">${fmtPrice(quote.price)}</div>
                        <div className={`text-xs font-mono flex items-center gap-1 justify-end ${up ? "text-emerald-400" : "text-red-400"}`}>
                          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {up ? "+" : ""}{quote.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    )}
                  </div>
                  <LinkPills links={stockLinks(s.symbol, s.name)} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Related smart-money headlines */}
      {relatedNews.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5" /> כותרות כסף חכם רלוונטיות
          </h2>
          <div className="space-y-2">
            {relatedNews.map((n, i) => (
              <a
                key={`${n.ticker}-${i}`}
                href={safeUrl(n.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-border bg-secondary/20 p-3 hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-primary">{n.influencer} · {n.ticker}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${n.direction === "LONG" ? "bg-emerald-500/15 text-emerald-400" : n.direction === "SHORT" ? "bg-red-500/15 text-red-400" : "bg-muted/40 text-muted-foreground"}`}>
                    {n.direction} · {Math.round(n.confidence)}%
                  </span>
                </div>
                <p className="text-sm text-foreground/90 mt-1 group-hover:text-foreground line-clamp-2">{n.headline}</p>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                  {n.source} <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {submitted && (
        <section className="space-y-3 pt-2">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">מחקר כללי</h2>
          <LinkPills links={QUICK_LINKS} />
        </section>
      )}

      <p className="text-[10px] text-muted-foreground/70 text-center" dir="rtl">
        כל הנתונים והקישורים חינמיים לחלוטין. מידע לצורכי לימוד בלבד — לא ייעוץ השקעות.
      </p>
    </div>
  );
}
