import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { relativeDayLabel, type CalendarEvent } from "@/lib/news-calendar-bot";

const SEEN_KEY = "arb_scan_calendar_seen";

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Headless watcher: when an important event is within two days, it raises a one-
 * time toast (per event, persisted in localStorage so it never nags twice). Only
 * high/medium-impact items trigger a toast to keep it quiet and useful.
 */
export function CalendarAlerter() {
  const { upcoming } = useCalendarEvents();
  const { toast } = useToast();
  const seenRef = useRef<Set<string>>(loadSeen());

  useEffect(() => {
    if (!upcoming.length) return;
    const now = new Date();
    const toAlert = upcoming.filter(
      (e: CalendarEvent) => e.impact !== "low" && !seenRef.current.has(e.id),
    );
    if (!toAlert.length) return;

    for (const e of toAlert) {
      seenRef.current.add(e.id);
      toast({
        title: `📅 ${relativeDayLabel(e, now)} · ${e.category}`,
        description: e.title,
      });
    }
    saveSeen(seenRef.current);
  }, [upcoming, toast]);

  return null;
}
