import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetRecommendations, getGetRecommendationsQueryKey } from "@workspace/api-client-react";
import { useRefresh } from "@/contexts/refresh-context";
import { RefreshCw, Zap, Bell, BellOff } from "lucide-react";

const NOTIF_ENABLED_KEY = "arb_scan_notifications_enabled";
const RETURN_THRESHOLD = 5;

const globalNotifiedKeys = new Set<string>();

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

  const { data: recs } = useGetRecommendations({
    query: {
      queryKey: getGetRecommendationsQueryKey(),
      refetchInterval: intervalFor(30000, 30000),
    },
  });

  function manualRefresh() {
    setSpinning(true);
    queryClient.invalidateQueries();
    window.setTimeout(() => setSpinning(false), 700);
  }

  const toggleNotifications = useCallback(async () => {
    if (!("Notification" in window)) return;
    if (notifEnabled) {
      setNotifEnabled(false);
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

  useEffect(() => {
    if (!notifActive || !recs) return;
    const hot = recs.filter((r) => r.potentialReturn >= RETURN_THRESHOLD);
    const currentKeys = new Set(hot.map((r) => `${r.binanceSymbol}|${r.action}`));
    for (const r of hot) {
      const key = `${r.binanceSymbol}|${r.action}`;
      if (globalNotifiedKeys.has(key)) continue;
      globalNotifiedKeys.add(key);
      try {
        new Notification(`HEAVY GUARD · ${r.binanceSymbol}`, {
          body: `${r.action.replace(/_/g, " ")} — ${r.potentialReturn >= 100 ? "100x+" : `${r.potentialReturn.toFixed(1)}x`} potential return (${r.confidence})`,
          tag: key,
        });
      } catch {}
    }
    for (const k of Array.from(globalNotifiedKeys)) {
      if (!currentKeys.has(k)) globalNotifiedKeys.delete(k);
    }
  }, [recs, notifActive]);

  const isFast = speed === "fast";

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={toggleSpeed}
        title={isFast ? "Fast refresh ON — click for normal" : "Normal refresh — click for fast"}
        className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-mono font-bold tracking-wider uppercase transition-all ${
          isFast ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Zap className={`h-3 w-3 ${isFast ? "text-primary" : "opacity-70"}`} />
        <span className="hidden sm:inline">{isFast ? "Fast" : "Normal"}</span>
      </button>

      <button
        onClick={manualRefresh}
        title="Refresh data now"
        className="flex items-center justify-center rounded h-6 w-6 text-muted-foreground hover:text-primary transition-colors"
      >
        <RefreshCw className={`h-3 w-3 ${spinning ? "animate-spin" : ""}`} />
      </button>

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
        className={`flex items-center justify-center rounded h-6 w-6 transition-colors ${
          notifActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        } ${perm === "unsupported" ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        {notifActive ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
      </button>
    </div>
  );
}
