import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetRecommendations, getGetRecommendationsQueryKey } from "@workspace/api-client-react";
import { useRefresh } from "@/contexts/refresh-context";
import { RefreshCw, Zap, Bell, BellOff } from "lucide-react";

const NOTIF_ENABLED_KEY = "arb_scan_notifications_enabled";
const RETURN_THRESHOLD = 5;

type Perm = "default" | "granted" | "denied" | "unsupported";

function getPermission(): Perm {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as Perm;
}

export function TopControls() {
  const { speed, toggleSpeed, intervalFor } = useRefresh();
  const queryClient = useQueryClient();

  const [spinning, setSpinning] = useState(false);
  const [perm, setPerm] = useState<Perm>(getPermission);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(NOTIF_ENABLED_KEY) === "1"; } catch { return false; }
  });

  const notifActive = notifEnabled && perm === "granted";

  // Poll recommendations to feed the notification watcher (always on, fast-ish).
  const { data: recs } = useGetRecommendations({
    query: {
      queryKey: getGetRecommendationsQueryKey(),
      refetchInterval: intervalFor(30000, 30000),
    },
  });

  const notifiedRef = useRef<Set<string>>(new Set());

  function manualRefresh() {
    setSpinning(true);
    queryClient.invalidateQueries();
    window.setTimeout(() => setSpinning(false), 700);
  }

  const toggleNotifications = useCallback(async () => {
    if (!("Notification" in window)) return;
    if (notifEnabled) {
      setNotifEnabled(false);
      notifiedRef.current.clear();
      try { localStorage.setItem(NOTIF_ENABLED_KEY, "0"); } catch {}
      return;
    }
    let p = Notification.permission as Perm;
    if (p === "default") {
      p = (await Notification.requestPermission()) as Perm;
    }
    setPerm(p);
    if (p === "granted") {
      setNotifEnabled(true);
      try { localStorage.setItem(NOTIF_ENABLED_KEY, "1"); } catch {}
      new Notification("HEAVY GUARD alerts on", {
        body: `You'll be notified when a signal reaches ${RETURN_THRESHOLD}x potential return.`,
      });
    }
  }, [notifEnabled]);

  // Watch for high-potential signals and fire device notifications.
  useEffect(() => {
    if (!notifActive || !recs) return;
    const hot = recs.filter((r) => r.potentialReturn >= RETURN_THRESHOLD);
    const currentKeys = new Set(hot.map((r) => `${r.binanceSymbol}|${r.action}`));
    for (const r of hot) {
      const key = `${r.binanceSymbol}|${r.action}`;
      if (notifiedRef.current.has(key)) continue;
      notifiedRef.current.add(key);
      try {
        new Notification(`HEAVY GUARD · ${r.binanceSymbol}`, {
          body: `${r.action.replace(/_/g, " ")} — ${r.potentialReturn >= 100 ? "100x+" : `${r.potentialReturn.toFixed(1)}x`} potential return (${r.confidence})`,
          tag: key,
        });
      } catch {}
    }
    // Allow re-notifying once a signal drops below threshold and returns.
    for (const k of Array.from(notifiedRef.current)) {
      if (!currentKeys.has(k)) notifiedRef.current.delete(k);
    }
  }, [recs, notifActive]);

  const isFast = speed === "fast";

  return (
    <div className="fixed top-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-card/90 backdrop-blur px-1.5 py-1 shadow-lg" style={{ boxShadow: "0 4px 20px hsl(0 0% 0% / 0.4)" }}>
      {/* Refresh speed toggle */}
      <button
        onClick={toggleSpeed}
        title={isFast ? "Fast refresh ON — click for normal" : "Normal refresh — click for fast"}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-mono font-bold tracking-wider uppercase transition-all ${
          isFast ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Zap className={`h-3 w-3 ${isFast ? "" : "opacity-70"}`} />
        {isFast ? "Fast" : "Normal"}
      </button>

      <div className="h-4 w-px bg-border" />

      {/* Manual refresh */}
      <button
        onClick={manualRefresh}
        title="Refresh data now"
        className="flex items-center justify-center rounded-full h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} />
      </button>

      <div className="h-4 w-px bg-border" />

      {/* Notifications */}
      <button
        onClick={toggleNotifications}
        title={
          perm === "unsupported"
            ? "Notifications not supported in this browser"
            : notifActive
              ? `Alerts ON — notifying at ${RETURN_THRESHOLD}x potential`
              : perm === "denied"
                ? "Notifications blocked in browser settings"
                : "Enable device notifications for high-potential signals"
        }
        disabled={perm === "unsupported"}
        className={`flex items-center justify-center rounded-full h-7 w-7 transition-colors ${
          notifActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        } ${perm === "unsupported" ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        {notifActive ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
