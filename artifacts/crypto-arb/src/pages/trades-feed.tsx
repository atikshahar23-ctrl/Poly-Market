import { Activity, RefreshCw, ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useUser } from "@clerk/react";
import {
  useGetPublicTrades,
  getGetPublicTradesQueryKey,
  type PublicTrade,
} from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/language-context";
import { t } from "@/lib/i18n";

function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs < 0.001) return n.toFixed(8);
  if (abs < 1) return n.toFixed(6);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function timeAgoHe(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "כעת";
  if (m < 60) return `${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ש׳`;
  const d = Math.floor(h / 24);
  return `${d} ימים`;
}

function pctFromPrices(entry: number | null | undefined, exit: number | null | undefined, direction: string | null | undefined): number | null {
  const e = entry ?? 0;
  const x = exit ?? 0;
  if (!e || !x) return null;
  const raw = (x - e) / e;
  const dir = direction === "SHORT" || direction === "NO" ? -1 : 1;
  return raw * dir * 100;
}

function TradeRow({ trade, lang, isSelf }: { trade: PublicTrade; lang: "he" | "en"; isSelf: boolean }) {
  const dir = trade.direction ?? "LONG";
  const isUp = trade.pnl >= 0;
  const pct = trade.pct ?? pctFromPrices(trade.entryPrice, trade.exitPrice, trade.direction);
  const pctStr = pct != null ? `${isUp ? "+" : ""}${pct.toFixed(2)}%` : null;
  const typeLabel =
    trade.type === "BINANCE"
      ? t("td.typeBinance", lang)
      : trade.type === "STOCK"
      ? t("td.typeStock", lang)
      : trade.type === "POLYMARKET"
      ? t("td.typePolymarket", lang)
      : trade.type === "FUNDING"
      ? t("td.typeFunding", lang)
      : trade.type === "OPTION"
      ? t("td.typeOption", lang)
      : trade.type;

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border px-3 py-3 transition-colors ${
        isSelf
          ? "border-[#cdbfa4]/45 bg-[#cdbfa4]/[0.06]"
          : "border-[#9fb4c7]/15 bg-white/[0.015] hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-bold text-[#e6edf4] tracking-wider uppercase shrink-0">
            {trade.symbol}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#9fb4c7]/55 shrink-0">
            {typeLabel}
          </span>
          {trade.leverage && trade.leverage > 1 && (
            <span className="text-[10px] font-mono text-[#9fb4c7]/55 shrink-0">{trade.leverage}x</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSelf && (
            <span className="rounded-full border border-[#cdbfa4]/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#cdbfa4]">
              {t("leaderboard.you", lang)}
            </span>
          )}
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#9fb4c7]/45">
            {lang === "he" ? timeAgoHe(trade.closedAt) : timeAgo(trade.closedAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {isUp ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
          )}
          <span className={`font-mono text-sm font-bold tabular-nums ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
            {isUp ? "+" : ""}${Math.abs(trade.pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          {pctStr && (
            <span className={`font-mono text-[10px] ${isUp ? "text-emerald-400/80" : "text-rose-400/80"}`}>
              {pctStr}
            </span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[10px] text-[#9fb4c7]/65 font-mono">
          <span>{formatPrice(trade.entryPrice)}</span>
          <span className="text-[#9fb4c7]/35">→</span>
          <span>{formatPrice(trade.exitPrice)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#9fb4c7]/50 truncate">
          {trade.displayName}
          {trade.source && (
            <span className="text-[#9fb4c7]/35"> · {trade.source}</span>
          )}
        </span>
        <span className={`text-[10px] font-mono uppercase tracking-wider ${dir === "LONG" || dir === "YES" ? "text-emerald-400/70" : "text-rose-400/70"}`}>
          {dir}
        </span>
      </div>
    </div>
  );
}

export default function TradesFeedPage() {
  const { lang } = useLanguage();
  const { user } = useUser();
  const { data, isLoading, isError, refetch, isFetching } = useGetPublicTrades(undefined, {
    query: { queryKey: getGetPublicTradesQueryKey(), refetchInterval: 30_000 },
  });

  const trades = data?.trades ?? [];
  const myUserId = user?.id;

  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} className="relative min-h-dvh p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-[#cdbfa4]" strokeWidth={1.6} />
            <h1
              className="text-2xl font-semibold tracking-[0.06em] text-[#e6edf4]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {t("tradesFeed.title", lang)}
            </h1>
          </div>
          <p className="text-xs text-[#9fb4c7]/70">
            {t("tradesFeed.subtitle", lang)}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#9fb4c7]/25 bg-white/[0.02] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#9fb4c7] transition-colors hover:bg-[#9fb4c7]/10"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          {t("tradesFeed.refresh", lang)}
        </button>
      </div>

      {/* Educational disclaimer */}
      <div className="flex items-center gap-2 rounded-md border border-[#9fb4c7]/15 bg-white/[0.015] px-3 py-2 text-[10px] text-[#9fb4c7]/65">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#9fb4c7]/70" />
        {t("tradesFeed.disclaimer", lang)}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-lg border border-[#9fb4c7]/10 bg-white/[0.02]" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-[#9fb4c7]/15 bg-white/[0.015] p-8 text-center text-sm text-[#9fb4c7]/70">
          {t("tradesFeed.error", lang)}
        </div>
      ) : trades.length === 0 ? (
        <div className="rounded-lg border border-[#9fb4c7]/15 bg-white/[0.015] p-8 text-center text-sm text-[#9fb4c7]/70">
          {t("tradesFeed.empty", lang)}
        </div>
      ) : (
        <div className="space-y-2">
          {trades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} lang={lang} isSelf={myUserId != null && trade.userId === myUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
