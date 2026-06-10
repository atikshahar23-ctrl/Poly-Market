import { useState } from "react";
import { useLocation } from "wouter";
import { TrendingUp, TrendingDown, ExternalLink, Trophy, Activity, DollarSign } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePortfolio } from "@/contexts/portfolio-context";
import { useLanguage } from "@/contexts/language-context";
import { t } from "@/lib/i18n";

function fmtUsd(n: number, dp = 2): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function sourceToBotId(source: string | undefined, type?: string): string | null {
  if (type === "POLYMARKET") return "bot-poly";
  if (type === "FUNDING") return "bot-funding";
  if (!source) return null;
  if (source.includes("Scalp")) return "bot-scalp";
  if (source.includes("Momentum")) return "bot-momentum";
  if (source.includes("Smart-Money")) return "bot-smart";
  if (source === "Dip Buyer") return "bot-dipbuyer";
  if (source === "Breakout Hunter") return "bot-breakout";
  if (source === "Blue-Chip DCA") return "bot-dca";
  return null;
}

interface BotStatsPopoverProps {
  source?: string;
  type?: string;
  label: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function BotStatsPopover({ source, type, label, className, onClick }: BotStatsPopoverProps) {
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const { tradeHistory, binancePositions, stockPositions, polyPositions, fundingPositions } = usePortfolio();

  const stats = (() => {
    let trades = tradeHistory;
    if (source) {
      trades = trades.filter(t => t.source === source);
    } else if (type === "POLYMARKET") {
      trades = trades.filter(t => t.type === "POLYMARKET");
    } else if (type === "FUNDING") {
      trades = trades.filter(t => t.type === "FUNDING");
    } else {
      trades = [];
    }

    const total = trades.length;
    const wins = trades.filter(t => t.pnl > 0).length;
    const winRate = total > 0 ? (wins / total) * 100 : null;
    const cumulativePnl = trades.reduce((s, t) => s + t.pnl, 0);

    let openCount = 0;
    if (source) {
      openCount +=
        binancePositions.filter(p => p.source === source).length +
        stockPositions.filter(p => p.source === source).length;
    } else if (type === "POLYMARKET") {
      openCount = polyPositions.filter(p => p.source != null || p.auto).length;
    } else if (type === "FUNDING") {
      openCount = fundingPositions.length;
    }

    return { total, wins, winRate, cumulativePnl, openCount };
  })();

  function handleGoToBot(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    const botId = sourceToBotId(source, type);
    if (botId) sessionStorage.setItem("scrollToBotId", botId);
    navigate("/bots");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={className}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(v => !v);
            onClick?.(e);
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={(e) => {
            const rel = e.relatedTarget as HTMLElement | null;
            if (rel?.closest?.("[data-bot-stats-popover]")) return;
            setOpen(false);
          }}
          title={source ? `${t("bots.pop.bot", lang)}: ${source}` : label}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-3"
        side="top"
        align="center"
        data-bot-stats-popover
        onMouseLeave={() => setOpen(false)}
        onClick={e => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold font-mono text-foreground truncate max-w-[120px]">{label}</span>
            <span className="text-[9px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
              {stats.openCount > 0 ? `${stats.openCount} ${t("bots.pop.open", lang)}` : t("bots.pop.noOpen", lang)}
            </span>
          </div>

          <div className="border-t border-border/50 pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Trophy className="h-3 w-3 text-amber-400" />
                {t("bots.pop.winRate", lang)}
              </span>
              <span className="font-bold text-foreground">
                {stats.winRate !== null ? `${stats.winRate.toFixed(0)}%` : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Activity className="h-3 w-3" />
                {t("bots.pop.trades", lang)}
              </span>
              <span className="font-bold text-foreground">
                {stats.total}
                {stats.total > 0 && (
                  <span className="text-muted-foreground font-normal">
                    {" "}({stats.wins}W/{stats.total - stats.wins}L)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                {t("bots.pop.totalPnl", lang)}
              </span>
              <span className={`font-bold flex items-center gap-0.5 ${stats.cumulativePnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {stats.cumulativePnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stats.cumulativePnl >= 0 ? "+" : "-"}${fmtUsd(Math.abs(stats.cumulativePnl))}
              </span>
            </div>
          </div>

          <button
            onClick={handleGoToBot}
            className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] font-mono font-bold text-primary hover:text-primary/80 border border-primary/30 hover:border-primary/60 rounded py-1 transition-colors"
          >
            {t("bots.pop.goToBot", lang)}
            <ExternalLink className="h-2.5 w-2.5" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
