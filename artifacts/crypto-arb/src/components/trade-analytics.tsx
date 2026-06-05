import { useMemo } from "react";
import {
  Brain, Gauge, TrendingUp, TrendingDown, BarChart3, Cpu, Sparkles,
} from "lucide-react";
import { usePortfolio, type ClosedTrade } from "@/contexts/portfolio-context";
import { useAutoTrader } from "@/contexts/autotrader-context";

/* Hebrew display labels for adaptive-manager bot ids. */
const BOT_LABELS: Record<string, string> = {
  dipbuyer: "קונה ירידות",
  breakout: "צייד פריצות",
  dca: "צבירת בלו-צ'יפ",
  scalp: "סקאלפ",
  momentum: "מומנטום",
  stock: "כסף חכם",
  smart: "כסף חכם",
  poly: "הימורי קריפטו",
};

const TYPE_LABEL_HE: Record<ClosedTrade["type"], string> = {
  BINANCE: "פיוצ'רס",
  STOCK: "מניות",
  POLYMARKET: "הימורי שוק",
};

function usd(n: number, dp = 2): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function groupStats(arr: ClosedTrade[]) {
  const n = arr.length;
  const wins = arr.filter((t) => t.pnl > 0).length;
  const net = arr.reduce((a, t) => a + t.pnl, 0);
  return { n, wins, winRate: n ? (wins / n) * 100 : 0, net };
}

function Sparkline({ pts }: { pts: number[] }) {
  if (pts.length < 2) return null;
  const W = 600;
  const H = 120;
  const min = Math.min(...pts, 0);
  const max = Math.max(...pts, 0);
  const span = max - min || 1;
  const stepX = W / (pts.length - 1);
  const toY = (v: number) => H - ((v - min) / span) * H;
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const stroke = last >= 0 ? "#22c55e" : "#ef4444";
  const zeroY = toY(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-24">
      <defs>
        <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="hsl(0 0% 100% / 0.12)" strokeWidth="1" strokeDasharray="4 4" />
      <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="url(#eqfill)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function BreakdownRow({ label, s }: { label: string; s: ReturnType<typeof groupStats> }) {
  if (s.n === 0) return null;
  const net = s.net;
  const color = net > 0 ? "#22c55e" : net < 0 ? "#ef4444" : "#a1a1aa";
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
      <span className="text-foreground/80">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{s.n} עסקאות</span>
        <span className="text-muted-foreground">{s.winRate.toFixed(0)}% הצלחה</span>
        <span className="font-bold tabular-nums" style={{ color }}>
          {net >= 0 ? "+" : ""}${usd(net)}
        </span>
      </div>
    </div>
  );
}

export function TradeAnalytics() {
  const { tradeHistory } = usePortfolio();
  const { settings } = useAutoTrader();

  const equity = useMemo(() => {
    const chrono = [...tradeHistory].reverse();
    let cum = 0;
    const pts = [0];
    for (const t of chrono) {
      cum += t.pnl;
      pts.push(cum);
    }
    return pts;
  }, [tradeHistory]);

  const expectancy = useMemo(() => {
    const n = tradeHistory.length;
    const winsArr = tradeHistory.filter((t) => t.pnl > 0);
    const lossArr = tradeHistory.filter((t) => t.pnl < 0);
    const avgWin = winsArr.length ? winsArr.reduce((a, t) => a + t.pnl, 0) / winsArr.length : 0;
    const avgLoss = lossArr.length ? Math.abs(lossArr.reduce((a, t) => a + t.pnl, 0) / lossArr.length) : 0;
    const winRate = n ? winsArr.length / n : 0;
    // Expectancy = mean realised P&L per trade. Computed directly so breakeven
    // trades don't get misclassified as losses (winRate + lossRate may be < 1).
    const exp = n ? tradeHistory.reduce((a, t) => a + t.pnl, 0) / n : 0;
    return { avgWin, avgLoss, winRate: winRate * 100, exp, n };
  }, [tradeHistory]);

  const byType = useMemo(() => {
    const t: ClosedTrade["type"][] = ["BINANCE", "STOCK", "POLYMARKET"];
    return t.map((k) => ({ key: k, s: groupStats(tradeHistory.filter((x) => x.type === k)) }));
  }, [tradeHistory]);

  const byExit = useMemo(() => {
    const reasons: { key: ClosedTrade["exit"] | "MANUAL"; label: string }[] = [
      { key: "TP", label: "יעד רווח (TP)" },
      { key: "SL", label: "עצירת הפסד (SL)" },
      { key: "LIQ", label: "חיסול (LIQ)" },
      { key: "MANUAL", label: "סגירה ידנית" },
    ];
    return reasons.map((r) => ({
      ...r,
      s: groupStats(tradeHistory.filter((x) => (x.exit ?? "MANUAL") === r.key)),
    }));
  }, [tradeHistory]);

  const bySource = useMemo(() => ({
    auto: groupStats(tradeHistory.filter((t) => t.auto)),
    manual: groupStats(tradeHistory.filter((t) => !t.auto)),
  }), [tradeHistory]);

  const bots = useMemo(
    () => Object.entries(settings.botStats).filter(([, st]) => st.trades > 0),
    [settings.botStats],
  );

  const insights = useMemo(() => {
    const out: string[] = [];
    if (tradeHistory.length === 0) {
      out.push("עדיין אין מספיק נתונים — הפעל את הבוטים כדי שהסוכן יתחיל ללמוד מהעסקאות.");
      return out;
    }
    const ranked = [...byType].filter((x) => x.s.n > 0).sort((a, b) => b.s.net - a.s.net);
    if (ranked.length) {
      const best = ranked[0];
      out.push(`האפיק הרווחי ביותר: ${TYPE_LABEL_HE[best.key]} (${best.s.net >= 0 ? "+" : ""}$${usd(best.s.net)}).`);
      const worst = ranked[ranked.length - 1];
      if (ranked.length > 1 && worst.s.net < 0) {
        out.push(`האפיק החלש ביותר: ${TYPE_LABEL_HE[worst.key]} ($${usd(worst.s.net)}) — הסוכן מהדק שם את הסלקטיביות.`);
      }
    }
    const tp = byExit.find((r) => r.key === "TP")?.s.n ?? 0;
    const sl = byExit.find((r) => r.key === "SL")?.s.n ?? 0;
    if (tp + sl > 0) {
      out.push(`יחס יעד-רווח מול עצירת-הפסד: ${tp} TP / ${sl} SL.`);
    }
    if (expectancy.n >= 10 && expectancy.winRate < 45) {
      out.push("אחוז ההצלחה נמוך — הסוכן מעלה את ספי הכניסה ומקטין חשיפה עד שהביצועים משתפרים.");
    }
    if (bySource.auto.n > 0 && bySource.manual.n > 0) {
      const diff = bySource.auto.winRate - bySource.manual.winRate;
      out.push(`מסחר אוטומטי לעומת ידני: ${bySource.auto.winRate.toFixed(0)}% מול ${bySource.manual.winRate.toFixed(0)}% הצלחה (פער ${diff >= 0 ? "+" : ""}${diff.toFixed(0)}%).`);
    }
    return out;
  }, [tradeHistory, byType, byExit, bySource, expectancy]);

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-black tracking-tight">ניתוח עסקאות ולמידת הסוכן</h2>
      </div>

      {/* Equity curve */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-3 w-3" /> עקומת הון (רווח/הפסד מצטבר)
        </div>
        {equity.length > 1 ? (
          <Sparkline pts={equity} />
        ) : (
          <p className="text-[11px] text-muted-foreground py-6 text-center">אין עדיין עסקאות סגורות להצגת עקומה.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Expectancy */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <Gauge className="h-3 w-3" /> תוחלת וביצועים
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="flex justify-between"><span className="text-muted-foreground">תוחלת לעסקה</span><span className="font-bold tabular-nums" style={{ color: expectancy.exp >= 0 ? "#22c55e" : "#ef4444" }}>{expectancy.exp >= 0 ? "+" : ""}${usd(expectancy.exp)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">אחוז הצלחה</span><span className="font-bold tabular-nums">{expectancy.winRate.toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">רווח ממוצע</span><span className="font-bold tabular-nums text-[#22c55e]">+${usd(expectancy.avgWin)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">הפסד ממוצע</span><span className="font-bold tabular-nums text-[#ef4444]">-${usd(expectancy.avgLoss)}</span></div>
          </div>
          <div className="h-px bg-border/50" />
          <div className="space-y-1.5">
            {byType.map(({ key, s }) => (
              <BreakdownRow key={key} label={TYPE_LABEL_HE[key]} s={s} />
            ))}
          </div>
        </div>

        {/* Exit reasons + source */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <TrendingDown className="h-3 w-3" /> פילוח לפי סיבת יציאה
          </div>
          <div className="space-y-1.5">
            {byExit.map((r) => (
              <BreakdownRow key={r.key} label={r.label} s={r.s} />
            ))}
          </div>
          <div className="h-px bg-border/50" />
          <div className="space-y-1.5">
            <BreakdownRow label="אוטומטי" s={bySource.auto} />
            <BreakdownRow label="ידני" s={bySource.manual} />
          </div>
        </div>
      </div>

      {/* Agent learning */}
      <div className="rounded-lg border bg-card p-3 space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <Brain className="h-3 w-3 text-primary" /> למידת הסוכן (מנהל אדפטיבי {settings.adaptiveEnabled ? "פעיל" : "כבוי"})
        </div>
        {bots.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">
            המנהל האדפטיבי עדיין לא צבר נתונים. כשהבוטים יסגרו עסקאות, הסוכן יכוונן לכל בוט את רמת הסלקטיביות לפי אחוז ההצלחה המתגלגל שלו.
          </p>
        ) : (
          <div className="space-y-2">
            {bots.map(([id, st]) => {
              const wr = st.trades ? (st.wins / st.trades) * 100 : 0;
              const tighter = st.edge > 1.0;
              const looser = st.edge < 1.0;
              const note = tighter
                ? "מהדק כניסות — נעשה סלקטיבי יותר אחרי רצף חלש"
                : looser
                ? "מרחיב פעילות — ביצועים טובים מאפשרים יותר עסקאות"
                : "ניטרלי — אוסף נתונים";
              const noteColor = tighter ? "#f59e0b" : looser ? "#22c55e" : "#a1a1aa";
              return (
                <div key={id} className="rounded-md border border-border/60 bg-secondary/20 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] font-mono font-bold">{BOT_LABELS[id] ?? id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                      <span>{st.trades} עסקאות</span>
                      <span>{wr.toFixed(0)}% הצלחה</span>
                      <span className="font-bold tabular-nums" style={{ color: st.netPnl >= 0 ? "#22c55e" : "#ef4444" }}>
                        {st.netPnl >= 0 ? "+" : ""}${usd(st.netPnl)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-background/60 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (st.edge / 2) * 100)}%`, background: noteColor }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">סלקטיביות ×{st.edge.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] font-mono" style={{ color: noteColor }}>{note}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rule-based insights */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> תובנות (מבוסס-חוקים, ללא AI בתשלום)
        </div>
        <ul className="space-y-1">
          {insights.map((s, i) => (
            <li key={i} className="text-[11px] text-foreground/90 leading-relaxed flex gap-1.5">
              <span className="text-primary">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
