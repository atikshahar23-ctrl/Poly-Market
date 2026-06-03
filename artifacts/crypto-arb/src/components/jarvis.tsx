import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  useGetRecommendations, getGetRecommendationsQueryKey,
  useGetStockRecommendations, getGetStockRecommendationsQueryKey,
  useGetStocks, getGetStocksQueryKey,
  useGetInfluencerSignals, getGetInfluencerSignalsQueryKey,
  Recommendation, StockRecommendation,
} from "@workspace/api-client-react";
import { usePortfolio } from "@/contexts/portfolio-context";
import { X, Send, Sparkles, ExternalLink, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface MsgLink {
  label: string;
  href: string;
}
interface Msg {
  id: string;
  role: "jarvis" | "user";
  text: string;
  links?: MsgLink[];
}

const QUICK_ACTIONS = [
  "Top stock to buy",
  "Stocks to avoid",
  "Smart money",
  "Crypto signal",
  "Market mood",
  "My portfolio",
] as const;

function uid() {
  return Math.random().toString(36).slice(2);
}

function tvLink(tvSymbol: string): MsgLink {
  return { label: "Chart", href: `https://www.tradingview.com/symbols/${tvSymbol}/` };
}
function newsLink(symbol: string, name: string): MsgLink {
  return { label: "News", href: `https://news.google.com/search?q=${encodeURIComponent(`${symbol} ${name} stock`)}` };
}

/* ─────────────────────────────────────────────────────────────
   Animated SVG face — eyes blink on a timer, mouth opens/closes
   while JARVIS is speaking, subtle pupil drift when idle.
   ───────────────────────────────────────────────────────────── */
function JarvisFace({ speaking, size = 48 }: { speaking: boolean; size?: number }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const loop = () => {
      const next = 2200 + Math.random() * 2600;
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, next);
    };
    loop();
    return () => clearTimeout(timeout);
  }, []);

  const gold = "hsl(43 74% 52%)";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="overflow-visible">
      {/* face ring */}
      <circle cx="24" cy="24" r="21" fill="hsl(0 0% 7%)" stroke={gold} strokeWidth="1.5" opacity="0.95" />
      <circle cx="24" cy="24" r="21" fill="none" stroke={gold} strokeWidth="0.5" opacity="0.4" className="jarvis-ring" />
      {/* eyes */}
      <g style={{ transition: "transform 80ms", transformOrigin: "center", transform: blink ? "scaleY(0.1)" : "scaleY(1)" }}>
        <circle cx="16.5" cy="20" r="3.1" fill={gold} className="jarvis-glow" />
        <circle cx="31.5" cy="20" r="3.1" fill={gold} className="jarvis-glow" />
      </g>
      {/* mouth — animated bar while speaking */}
      {speaking ? (
        <rect x="15" y="30" width="18" height="6" rx="3" fill={gold} className="jarvis-mouth-speak" />
      ) : (
        <rect x="17" y="32" width="14" height="2.4" rx="1.2" fill={gold} opacity="0.85" />
      )}
    </svg>
  );
}

export function Jarvis() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uid(),
      role: "jarvis",
      text: "JARVIS online. I read the live Binance, Polymarket, stock and Smart-Money signals plus your simulator portfolio. Drag me anywhere, talk to me with the mic, or tap a shortcut below.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: cryptoRecs } = useGetRecommendations({
    query: { queryKey: getGetRecommendationsQueryKey(), refetchInterval: open ? 30000 : 90000 },
  });
  const { data: stockRecs } = useGetStockRecommendations({
    query: { queryKey: getGetStockRecommendationsQueryKey(), refetchInterval: open ? 30000 : 90000 },
  });
  const { data: stocks } = useGetStocks({
    query: { queryKey: getGetStocksQueryKey(), refetchInterval: open ? 30000 : 90000 },
  });
  const { data: influencers } = useGetInfluencerSignals({
    query: { queryKey: getGetInfluencerSignalsQueryKey(), refetchInterval: open ? 60000 : 180000 },
  });

  const { cash, totalDeposited, polyPositions, binancePositions, stockPositions, tradeHistory } = usePortfolio();

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  /* ── Voice output (TTS) ─────────────────────────────────────── */
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || mutedRef.current) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.02;
        u.pitch = 0.95;
        u.volume = 1;
        u.onstart = () => setSpeaking(true);
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
      } catch {
        setSpeaking(false);
      }
    },
    [ttsSupported],
  );

  const stopSpeaking = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [ttsSupported]);

  // Speak each new JARVIS message once.
  const lastSpokenRef = useRef<string | null>(null);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "jarvis") return;
    if (lastSpokenRef.current === last.id) return;
    lastSpokenRef.current = last.id;
    if (!muted) speak(last.text);
  }, [messages, muted, speak]);

  useEffect(() => {
    if (muted) stopSpeaking();
  }, [muted, stopSpeaking]);

  const topBuys = useMemo(() => (stockRecs ?? []).filter((r) => r.action === "BUY"), [stockRecs]);
  const topSells = useMemo(() => (stockRecs ?? []).filter((r) => r.action === "SELL"), [stockRecs]);
  const topGainers = useMemo(
    () => [...(stocks ?? [])].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3),
    [stocks],
  );

  // ── Proactive recommendations that pop up while the panel is closed ──
  interface Tip { id: string; label: string; tone: "buy" | "crypto" | "sell" | "smart"; text: string; links?: MsgLink[]; }
  const tips = useMemo<Tip[]>(() => {
    const out: Tip[] = [];
    const buy = topBuys[0];
    if (buy) {
      out.push({
        id: `buy-${buy.symbol}`,
        label: `Buy ${buy.symbol} · ${buy.confidence}`,
        tone: "buy",
        text: `Strongest stock to buy: ${buy.symbol} (${buy.name}) — ${buy.confidence} confidence. ${buy.rationale}`,
        links: [tvLink(buy.tradingViewSymbol), newsLink(buy.symbol, buy.name)],
      });
    }
    const inf = (influencers ?? [])[0];
    if (inf) {
      out.push({
        id: `smart-${inf.influencer}-${inf.ticker}`,
        label: `${inf.direction} ${inf.ticker} · ${Math.round(inf.confidence)}%`,
        tone: "smart",
        text: `Smart-Money: ${inf.influencer} is moving ${inf.ticker} (${inf.name}). Signal ${inf.direction} at ${Math.round(inf.confidence)}% conviction. "${inf.headline}"`,
        links: [{ label: "Article", href: inf.url }, tvLink(inf.ticker.replace(".", ""))],
      });
    }
    const crypto = (cryptoRecs ?? []).filter((r) => r.action !== "WATCH")[0];
    if (crypto) {
      const dir = crypto.action === "BUY_YES" ? "BUY YES" : "BUY NO";
      out.push({
        id: `crypto-${crypto.binanceSymbol}`,
        label: `${dir} ${crypto.binanceSymbol} · ${crypto.confidence}`,
        tone: "crypto",
        text: `Top crypto/Polymarket signal: ${dir} on ${crypto.binanceSymbol} (${crypto.confidence} confidence). ${crypto.rationale} Edge ~${crypto.edge.toFixed(1)} pts, potential ${crypto.potentialReturn.toFixed(1)}x.`,
        links: [tvLink(crypto.binanceSymbol.replace("USDT", "USD"))],
      });
    }
    const sell = topSells[0];
    if (sell) {
      out.push({
        id: `sell-${sell.symbol}`,
        label: `Avoid ${sell.symbol}`,
        tone: "sell",
        text: `Avoid / consider trimming: ${sell.symbol} (${sell.name}). ${sell.rationale}`,
        links: [tvLink(sell.tradingViewSymbol), newsLink(sell.symbol, sell.name)],
      });
    }
    return out;
  }, [topBuys, topSells, cryptoRecs, influencers]);

  const [tipIdx, setTipIdx] = useState(0);
  const [mutedUntil, setMutedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Rotate proactive tips and keep a clock so the muted window re-opens on its own.
  useEffect(() => {
    if (open || tips.length === 0) return;
    const t = setInterval(() => {
      setNow(Date.now());
      setTipIdx((i) => i + 1);
    }, 16000);
    return () => clearInterval(t);
  }, [open, tips.length]);

  const currentTip = tips.length > 0 ? tips[tipIdx % tips.length] : null;
  const showTip = !open && currentTip != null && now >= mutedUntil;

  const openWithTip = useCallback((tip: Tip) => {
    setMessages((prev) => [...prev, { id: uid(), role: "jarvis", text: tip.text, links: tip.links }]);
    setOpen(true);
  }, []);

  const dismissTip = useCallback(() => {
    setNow(Date.now());
    setMutedUntil(Date.now() + 3 * 60 * 1000);
  }, []);

  const respond = useCallback(
    (raw: string): Msg => {
      const q = raw.toLowerCase().trim();
      const id = uid();

      const wantsSmart = /\b(smart money|smart-money|influencer|trump|musk|elon|buffett|powell|pelosi|cathie|whale)/.test(q);
      const wantsBuy = /\b(buy|long|enter|best stock|top stock|invest|gain)/.test(q);
      const wantsSell = /\b(sell|short|avoid|dump|drop|exit|weak)/.test(q);
      const wantsCrypto = /\b(crypto|btc|bitcoin|eth|ethereum|sol|coin|poly|polymarket|arb|futures)/.test(q);
      const wantsPortfolio = /\b(portfolio|balance|account|my money|how am i|wallet|position)/.test(q);
      const wantsMood = /\b(mood|market|sentiment|overall|outlook|today)/.test(q);
      const wantsHelp = /\b(help|what can you|how do you|commands)/.test(q);

      if (wantsHelp) {
        return {
          id,
          role: "jarvis",
          text: "I can surface: the strongest stock to BUY, stocks to AVOID, Smart-Money influencer signals (Trump, Musk, Powell...), the best crypto/Polymarket signal, the overall market mood, and a read on your simulator portfolio. Use the shortcuts, type, or hit the mic and talk.",
        };
      }

      if (wantsSmart) {
        const pick = (influencers ?? [])[0];
        if (!pick) {
          return { id, role: "jarvis", text: "No Smart-Money signals are loaded yet — give the news feed a moment and ask again." };
        }
        return {
          id,
          role: "jarvis",
          text: `Smart-Money: ${pick.influencer} is moving ${pick.ticker} (${pick.name}) — signal ${pick.direction} at ${Math.round(pick.confidence)}% conviction (${pick.horizon.toLowerCase()}-term). Headline: "${pick.headline}".`,
          links: [{ label: "Article", href: pick.url }, tvLink(pick.ticker.replace(".", ""))],
        };
      }

      if (wantsPortfolio) {
        const openCount = polyPositions.length + binancePositions.length + stockPositions.length;
        const realized = tradeHistory.reduce((s, t) => s + t.pnl, 0);
        const wins = tradeHistory.filter((t) => t.pnl > 0).length;
        const winRate = tradeHistory.length ? Math.round((wins / tradeHistory.length) * 100) : 0;
        const deployedNote = openCount === 0
          ? "You have no open positions — plenty of dry powder to deploy."
          : `You hold ${openCount} open position${openCount > 1 ? "s" : ""}.`;
        return {
          id,
          role: "jarvis",
          text: `Cash available: $${cash.toLocaleString(undefined, { maximumFractionDigits: 0 })} of $${totalDeposited.toLocaleString(undefined, { maximumFractionDigits: 0 })} deposited. ${deployedNote} Closed trades: ${tradeHistory.length} (${winRate}% win rate, realized ${realized >= 0 ? "+" : "-"}$${Math.abs(realized).toFixed(0)}). ${realized < 0 ? "Tighten your entries — only act on HIGH/MEDIUM confidence signals." : "Solid — keep risking small and let the momentum signals lead."}`,
        };
      }

      if (wantsCrypto) {
        const actionable = (cryptoRecs ?? []).filter((r) => r.action !== "WATCH");
        const pick: Recommendation | undefined = actionable[0] ?? (cryptoRecs ?? [])[0];
        if (!pick) {
          return { id, role: "jarvis", text: "No crypto signals are loaded yet — give the scanner a moment and ask again." };
        }
        const dir = pick.action === "BUY_YES" ? "BUY YES" : pick.action === "BUY_NO" ? "BUY NO" : "WATCH";
        return {
          id,
          role: "jarvis",
          text: `Top crypto/Polymarket signal: ${dir} on ${pick.binanceSymbol} (${pick.confidence} confidence). ${pick.rationale} Edge ~${pick.edge.toFixed(1)} pts, potential ${pick.potentialReturn.toFixed(1)}x.`,
          links: [tvLink(pick.binanceSymbol.replace("USDT", "USD"))],
        };
      }

      if (wantsSell) {
        const pick: StockRecommendation | undefined = topSells[0];
        if (!pick) {
          return { id, role: "jarvis", text: "Nothing is flashing a strong SELL right now — momentum is broadly neutral-to-positive." };
        }
        return {
          id,
          role: "jarvis",
          text: `Avoid / consider trimming: ${pick.symbol} (${pick.name}). ${pick.rationale}`,
          links: [tvLink(pick.tradingViewSymbol), newsLink(pick.symbol, pick.name)],
        };
      }

      if (wantsBuy || (!wantsMood && q.length > 0)) {
        const pick: StockRecommendation | undefined = topBuys[0];
        if (!pick) {
          return {
            id,
            role: "jarvis",
            text: "No high-conviction BUY in stocks at the moment. Best near-term performer: " +
              (topGainers[0] ? `${topGainers[0].symbol} (${topGainers[0].changePercent >= 0 ? "+" : ""}${topGainers[0].changePercent.toFixed(1)}% today).` : "data still loading."),
            links: topGainers[0] ? [tvLink(topGainers[0].tradingViewSymbol), newsLink(topGainers[0].symbol, topGainers[0].name)] : undefined,
          };
        }
        return {
          id,
          role: "jarvis",
          text: `Strongest stock to buy: ${pick.symbol} (${pick.name}) — ${pick.confidence} confidence. ${pick.rationale}`,
          links: [tvLink(pick.tradingViewSymbol), newsLink(pick.symbol, pick.name)],
        };
      }

      // Market mood (default / explicit)
      const buys = topBuys.length;
      const sells = topSells.length;
      const mood = buys > sells * 1.5 ? "risk-on — buyers in control" : sells > buys * 1.5 ? "risk-off — sellers in control" : "mixed — no clear bias";
      const gainerLine = topGainers.length
        ? ` Today's leaders: ${topGainers.map((g) => `${g.symbol} ${g.changePercent >= 0 ? "+" : ""}${g.changePercent.toFixed(1)}%`).join(", ")}.`
        : "";
      return {
        id,
        role: "jarvis",
        text: `Market mood is ${mood}. Stock signals: ${buys} BUY vs ${sells} SELL.${gainerLine}`,
      };
    },
    [cryptoRecs, topBuys, topSells, topGainers, influencers, cash, totalDeposited, polyPositions, binancePositions, stockPositions, tradeHistory],
  );

  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const userMsg: Msg = { id: uid(), role: "user", text: clean };
      const reply = respond(clean);
      setMessages((prev) => [...prev, userMsg, reply]);
      setInput("");
    },
    [respond],
  );

  /* ── Voice input (SpeechRecognition) ────────────────────────── */
  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? ((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)
      : undefined;
  const micSupported = !!SpeechRecognitionCtor;
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!micSupported) {
      setMicError("Voice input isn't supported in this browser.");
      return;
    }
    setMicError(null);
    stopSpeaking();
    try {
      const Ctor = SpeechRecognitionCtor as new () => any;
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      rec.onstart = () => setListening(true);
      rec.onresult = (e: any) => {
        const transcript = e?.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) {
          if (!open) setOpen(true);
          send(transcript);
        }
      };
      rec.onerror = (e: any) => {
        setListening(false);
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          setMicError("Microphone permission denied. Enable it in your browser to talk to JARVIS.");
        } else if (e?.error === "no-speech") {
          setMicError("Didn't catch that — try again.");
        }
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setListening(false);
      setMicError("Couldn't start the microphone.");
    }
  }, [micSupported, SpeechRecognitionCtor, stopSpeaking, open, send]);

  const toggleMic = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
      if (ttsSupported) window.speechSynthesis.cancel();
    };
  }, [ttsSupported]);

  /* ── Draggable avatar ───────────────────────────────────────── */
  const AVATAR = 64;
  const initialPos = () => {
    if (typeof window === "undefined") return { x: 100, y: 100 };
    return { x: window.innerWidth - AVATAR - 20, y: window.innerHeight - AVATAR - 24 };
  };
  const [pos, setPos] = useState(initialPos);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean; dragging: boolean }>({
    dx: 0, dy: 0, moved: false, dragging: false,
  });

  const clamp = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    return {
      x: Math.max(8, Math.min(x, window.innerWidth - AVATAR - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - AVATAR - 8)),
    };
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false, dragging: true };
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const nx = e.clientX - dragRef.current.dx;
    const ny = e.clientY - dragRef.current.dy;
    if (Math.abs(e.clientX - (pos.x + dragRef.current.dx)) > 4 || Math.abs(e.clientY - (pos.y + dragRef.current.dy)) > 4) {
      dragRef.current.moved = true;
    }
    setPos(clamp(nx, ny));
  }, [clamp, pos]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    const wasDrag = dragRef.current.moved;
    dragRef.current.dragging = false;
    if (!wasDrag) setOpen(true);
  }, []);

  // Anchor the panel near the avatar, clamped to the viewport.
  const panelStyle = useMemo(() => {
    if (typeof window === "undefined") return { right: 20, bottom: 20 } as React.CSSProperties;
    const W = Math.min(380, window.innerWidth - 24);
    const H = Math.min(560, window.innerHeight - 24);
    let left = pos.x + AVATAR + 12;
    if (left + W > window.innerWidth - 8) left = pos.x - W - 12;
    if (left < 8) left = Math.max(8, (window.innerWidth - W) / 2);
    let top = pos.y - H + AVATAR;
    top = Math.max(12, Math.min(top, window.innerHeight - H - 12));
    return { left, top, width: W, height: H } as React.CSSProperties;
  }, [pos]);

  const voiceControls = (
    <div className="flex items-center gap-1">
      {micSupported && (
        <button
          onClick={toggleMic}
          aria-label={listening ? "Stop listening" : "Talk to JARVIS"}
          className={`p-1.5 rounded transition-colors ${listening ? "bg-red-500/20 text-red-400 animate-pulse" : "text-muted-foreground hover:text-primary hover:bg-secondary/60"}`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
      )}
      {ttsSupported && (
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute JARVIS" : "Mute JARVIS"}
          className={`p-1.5 rounded transition-colors ${muted ? "text-muted-foreground hover:text-foreground hover:bg-secondary/60" : "text-primary hover:bg-secondary/60"}`}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Draggable avatar + proactive recommendation bubble */}
      {!open && (
        <div
          className="fixed z-50 select-none touch-none"
          style={{ left: pos.x, top: pos.y, width: AVATAR }}
        >
          {showTip && currentTip && (
            <div
              className="absolute bottom-full right-0 mb-3 w-[min(300px,calc(100vw-2.5rem))] rounded-2xl border border-primary/30 bg-card/95 backdrop-blur shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-300"
              style={{ boxShadow: "0 0 32px hsl(43 74% 52% / 0.18)" }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(43 74% 52%), transparent)" }} />
              <div className="flex items-start gap-2.5 p-3">
                <div className="shrink-0 mt-0.5"><JarvisFace speaking={speaking} size={34} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest text-primary mb-1">
                    <Sparkles className="h-3 w-3" /> JARVIS · Live tip
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        currentTip.tone === "buy"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : currentTip.tone === "sell"
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : currentTip.tone === "smart"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-primary/15 text-primary border border-primary/30"
                      }`}
                    >
                      {currentTip.label}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-foreground/85 line-clamp-3">{currentTip.text}</p>
                  <button
                    onClick={() => openWithTip(currentTip)}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    View details <Send className="h-2.5 w-2.5" />
                  </button>
                </div>
                <button
                  onClick={dismissTip}
                  aria-label="Dismiss tip"
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <button
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            aria-label="Open JARVIS"
            className="relative grid place-items-center rounded-full cursor-grab active:cursor-grabbing jarvis-float"
            style={{ width: AVATAR, height: AVATAR, boxShadow: "0 0 28px hsl(43 74% 52% / 0.28)" }}
          >
            <JarvisFace speaking={speaking} size={AVATAR} />
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
            {tips.length > 0 && !showTip && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full whitespace-nowrap">
                {tips.length} tips
              </span>
            )}
          </button>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl border border-primary/30 bg-card shadow-2xl overflow-hidden"
          style={{ ...panelStyle, boxShadow: "0 0 40px hsl(43 74% 52% / 0.15)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2.5">
              <JarvisFace speaking={speaking} size={36} />
              <div>
                <div className="text-sm font-black font-mono tracking-widest text-primary uppercase leading-none">JARVIS</div>
                <div className="text-[9px] text-muted-foreground font-mono tracking-wider mt-1 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {listening ? "Listening…" : speaking ? "Speaking…" : "Advisory engine · live signals"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {voiceControls}
              <button onClick={() => { stopSpeaking(); stopListening(); setOpen(false); }} className="p-1.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {micError && (
            <div className="px-4 py-1.5 text-[10px] font-mono text-amber-400 bg-amber-500/10 border-b border-amber-500/20">{micError}</div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary/15 text-foreground border border-primary/20"
                    : "bg-secondary/40 text-foreground/90 border border-border"
                }`}>
                  {m.role === "jarvis" && (
                    <div className="flex items-center gap-1 mb-1 text-[9px] font-mono font-bold uppercase tracking-widest text-primary">
                      <Sparkles className="h-3 w-3" /> JARVIS
                    </div>
                  )}
                  <p>{m.text}</p>
                  {m.links && m.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.links.map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                        >
                          {l.label} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="px-3 pt-2 flex flex-wrap gap-1.5 border-t border-border">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a}
                onClick={() => send(a)}
                className="text-[10px] font-mono px-2 py-1 rounded-full border border-border bg-secondary/30 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                {a}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 p-3"
          >
            {micSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "Stop listening" : "Talk to JARVIS"}
                className={`h-9 w-9 flex items-center justify-center rounded-lg flex-shrink-0 border transition-colors ${listening ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse" : "border-border bg-secondary/40 text-muted-foreground hover:text-primary hover:border-primary/50"}`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Listening…" : "Ask JARVIS..."}
              className="flex-1 h-9 rounded-lg bg-secondary/40 border border-border px-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
