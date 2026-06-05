import { useEffect, useState } from "react";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { getMarketNotes, formatHebrewDate, formatClock, type MarketNoteKind } from "@/lib/market-calendar";

const KIND_COLOR: Record<MarketNoteKind, string> = {
  holiday: "0 72% 60%",
  macro: "32 84% 55%",
  expiry: "276 60% 65%",
  weekend: "190 70% 55%",
  info: "152 50% 50%",
};

/**
 * Live digital clock with seconds + Hebrew date, plus a note about any special
 * market day (holiday / FOMC / NFP / expiry / weekend). Educational calendar
 * only — not live data and not advice.
 */
export function MarketClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const notes = getMarketNotes(now);
  const top = notes[0];

  return (
    <div className="w-full flex flex-col items-center gap-1" dir="rtl">
      <div className="flex items-center gap-1.5">
        <CalendarClock className="h-3 w-3 text-primary/80" />
        <span
          className="font-mono text-lg short:text-base font-black tabular-nums tracking-[0.12em] text-primary"
          style={{ textShadow: "0 0 12px hsl(43 74% 52% / 0.45)" }}
        >
          {formatClock(now)}
        </span>
      </div>
      <span className="text-[9px] short:text-[8px] text-muted-foreground tracking-wide">
        {formatHebrewDate(now)}
      </span>
      {top && (
        <div
          className="mt-0.5 flex items-start gap-1 rounded-md px-2 py-1 w-full"
          style={{ background: `hsl(${KIND_COLOR[top.kind]} / 0.1)`, border: `1px solid hsl(${KIND_COLOR[top.kind]} / 0.3)` }}
          title={notes.map((n) => n.label).join(" · ")}
        >
          <AlertTriangle className="h-2.5 w-2.5 mt-0.5 shrink-0" style={{ color: `hsl(${KIND_COLOR[top.kind]})` }} />
          <span className="text-[8.5px] leading-tight text-foreground/85">
            {top.label}
            {notes.length > 1 && <span className="text-muted-foreground"> +{notes.length - 1}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
