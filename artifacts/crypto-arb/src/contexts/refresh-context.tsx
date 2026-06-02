import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type RefreshSpeed = "normal" | "fast";

interface RefreshContextValue {
  speed: RefreshSpeed;
  setSpeed: (s: RefreshSpeed) => void;
  toggleSpeed: () => void;
  /**
   * Returns the effective refetch interval (ms) for a given base interval.
   * `minMs` floors the result — use it for cache-backed endpoints so "fast"
   * mode never polls below the server cache TTL (which would just re-serve
   * stale cached data). Leave it 0 for genuinely real-time streams.
   */
  intervalFor: (baseMs: number, minMs?: number) => number;
}

const STORAGE_KEY = "arb_scan_refresh_speed";
const FAST_DIVISOR = 3;
const FAST_FLOOR_MS = 2000;

function loadSpeed(): RefreshSpeed {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "fast" || raw === "normal") return raw;
  } catch {}
  return "normal";
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [speed, setSpeedState] = useState<RefreshSpeed>(loadSpeed);

  const setSpeed = useCallback((s: RefreshSpeed) => {
    setSpeedState(s);
    try { localStorage.setItem(STORAGE_KEY, s); } catch {}
  }, []);

  const toggleSpeed = useCallback(() => {
    setSpeedState((prev) => {
      const next = prev === "fast" ? "normal" : "fast";
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  const intervalFor = useCallback(
    (baseMs: number, minMs: number = 0) => {
      const v = speed === "fast" ? Math.max(FAST_FLOOR_MS, Math.round(baseMs / FAST_DIVISOR)) : baseMs;
      return Math.max(v, minMs);
    },
    [speed],
  );

  return (
    <RefreshContext.Provider value={{ speed, setSpeed, toggleSpeed, intervalFor }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error("useRefresh must be used inside RefreshProvider");
  return ctx;
}
