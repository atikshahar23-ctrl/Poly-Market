/**
 * Master Advisor — a single, top-level rule-based expert persona.
 *
 * This module is PURE: it reads a snapshot of the whole app's state (live
 * signals from every source, fleet conviction, per-bot track records,
 * multi-wallet health and the current automation settings) and synthesizes
 * (a) one top-level "read" of the market + portfolio and (b) a ranked list of
 * suggested moves. It NEVER executes anything and has no side effects — the
 * page wires each move's `action` to the existing context helpers and runs it
 * only after the user approves. Everything is framed as an educational
 * paper-trading scenario, never financial advice.
 */
import type { AlphaState, TradeMode } from "@/contexts/autotrader-context";
import { t } from "@/lib/i18n";

export type Lang = "he" | "en";
export type Regime = "RISK_ON" | "RISK_OFF" | "MIXED";
export type MoveTone = "critical" | "opportunity" | "tune";
export type AdvisorIcon =
  | "shield" | "siren" | "trendingDown" | "trendingUp" | "gauge"
  | "rocket" | "zap" | "wallet" | "scissors" | "brain" | "turtle" | "sparkles";

/** A move's concrete effect, mapped to an existing context helper by the page. */
export interface AdvisorActionSpec {
  kind:
    | "ARM_ALL" | "DISARM_ALL" | "SET_INTENSITY" | "SET_TRADE_MODE"
    | "SET_CASH_FLOOR" | "ENABLE_AUTOPILOT" | "ENABLE_ALPHA"
    | "START_BOOST" | "CLOSE_BOT_POSITIONS" | "ENABLE_RISK_MANAGER"
    | "ENABLE_SMART_EXIT" | "ENABLE_DAILY_STOP";
  intensity?: number;
  tradeMode?: TradeMode;
  cashFloorPct?: number;
}

export interface AdvisorMove {
  /** Stable id (kind + params) so dismissal survives re-renders. */
  id: string;
  tone: MoveTone;
  /** Higher = more urgent; the page sorts and caps the list by this. */
  priority: number;
  icon: AdvisorIcon;
  /** Localized copy, resolved for the requested language. */
  title: string;
  body: string;
  cta: string;
  action: AdvisorActionSpec;
}

export interface AdvisorRead {
  regime: Regime;
  /** -100 (deeply risk-off) … +100 (deeply risk-on). */
  bias: number;
  /** 0…100 conviction in the read. */
  conviction: number;
  /** Localized copy, resolved for the requested language. */
  tag: string;
  headline: string;
  market: string;
  portfolio: string;
}

/** One bot's standing, mirrored from the Bot Command fleet roll-up. */
export interface AdvisorBot {
  key: string;
  armed: boolean;
  paused: boolean;
  trades: number;
  wins: number;
  /** 0…100 realized win-rate over this wallet's closed trades. */
  winRate: number;
  net: number;
  open: number;
  /** Adaptive selectivity (1 = baseline; >1 = the manager made it pickier). */
  edge: number;
}

/** Lightweight per-wallet health used for ranking across portfolios. */
export interface AdvisorWallet {
  id: string;
  name: string;
  /** free cash / total deposited (0…1+). */
  cashRatio: number;
  openPositions: number;
  active: boolean;
}

/** Cross-source signal strength, distilled from every live feed. */
export interface AdvisorSignals {
  scalpLongHigh: number;
  scalpShortHigh: number;
  momentumSurges: number;
  stockBuyHigh: number;
  stockSellHigh: number;
  /** Polymarket markets pricing a lopsided (>=72%) outcome. */
  polyStrong: number;
  /** Distinct live sources leaning the same way as the fleet's alpha read. */
  sourcesAgreeing: number;
}

/** Everything the advisor reasons over — assembled by the page from live state. */
export interface AdvisorSnapshot {
  // ── Market ──
  btcChange: number | null;
  avgChange: number;
  fearGreed: number | null;
  alpha: AlphaState;
  signals: AdvisorSignals;
  // ── Portfolio ──
  cashRatio: number;       // free cash / total deposited (0…1+)
  drawdownPct: number;     // estimated equity drawdown from deposited (0…100)
  dailyRealizedPct: number;// today's realized PnL as % of deposited
  openAuto: number;        // open bot-placed positions
  bots: AdvisorBot[];      // per-bot standing (active wallet)
  wallets: AdvisorWallet[];// every paper wallet's health
  // ── Automation settings ──
  anyBotsOn: boolean;
  autoPilotOn: boolean;
  alphaEnabled: boolean;
  riskManagerEnabled: boolean;
  smartExitEnabled: boolean;
  dailyStopEnabled: boolean;
  intensity: number;       // 1…5 gear
  tradeMode: TradeMode;
  cashFloorPct: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Translate a key and interpolate {placeholders}. */
function tr(key: string, lang: Lang, repl?: Record<string, string | number>): string {
  let s = t(key, lang);
  if (repl) for (const [k, v] of Object.entries(repl)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

function dirWord(d: AlphaState["direction"], lang: Lang): string {
  if (d === "LONG") return tr("advisor.dirWord.long", lang);
  if (d === "SHORT") return tr("advisor.dirWord.short", lang);
  return tr("advisor.dirWord.neutral", lang);
}

/** Net cross-source directional lean (positive = bullish, negative = bearish). */
export function signalLean(s: AdvisorSignals): number {
  return (s.scalpLongHigh - s.scalpShortHigh) + s.momentumSurges + (s.stockBuyHigh - s.stockSellHigh);
}

/** Split the fleet into good / weak / paused buckets by realized track record. */
export function classifyBots(bots: AdvisorBot[]) {
  const rated = bots.filter((b) => b.trades >= 4);
  const good = rated.filter((b) => b.winRate >= 50 && b.net >= 0);
  const weak = rated.filter((b) => b.winRate < 40 || b.net < 0);
  const paused = bots.filter((b) => b.paused);
  return { rated, good, weak, paused };
}

/** Synthesize the one top-level read of market + portfolio. */
export function buildAdvisorRead(s: AdvisorSnapshot, lang: Lang): AdvisorRead {
  const a = s.alpha;
  const lean = signalLean(s.signals);
  let bias = 0;
  if (a.direction === "LONG") bias += a.confluence * 0.6;
  else if (a.direction === "SHORT") bias -= a.confluence * 0.6;
  if (s.btcChange != null) bias += clamp(s.btcChange, -5, 5) * 5;
  bias += clamp(s.avgChange, -4, 4) * 4;
  if (s.fearGreed != null) bias += (s.fearGreed - 50) * 0.4;
  // Cross-source signal strength tilts the read on top of the alpha consensus.
  bias += clamp(lean, -6, 6) * 3;
  bias = Math.round(clamp(bias, -100, 100));

  const regime: Regime = bias > 22 ? "RISK_ON" : bias < -22 ? "RISK_OFF" : "MIXED";
  // More live sources agreeing with the read → more conviction in it.
  const conviction = clamp(
    Math.round(Math.abs(bias) * 0.6 + a.sources * 6 + s.signals.sourcesAgreeing * 4),
    0, 100,
  );

  const cashPct = Math.round(clamp(s.cashRatio, 0, 5) * 100);
  const daily = `${s.dailyRealizedPct >= 0 ? "+" : ""}${s.dailyRealizedPct.toFixed(1)}%`;
  const btc = s.btcChange != null ? `${s.btcChange >= 0 ? "+" : ""}${s.btcChange.toFixed(2)}%` : "—";
  const avg = `${s.avgChange >= 0 ? "+" : ""}${s.avgChange.toFixed(2)}%`;
  const fg = s.fearGreed != null ? String(s.fearGreed) : "—";

  const tag = regime === "RISK_ON"
    ? tr("advisor.tag.riskOn", lang)
    : regime === "RISK_OFF"
      ? tr("advisor.tag.riskOff", lang)
      : tr("advisor.tag.mixed", lang);

  const ddNote = s.drawdownPct >= 12
    ? tr("advisor.read.ddHigh", lang, { n: s.drawdownPct.toFixed(0) })
    : tr("advisor.read.ddLow", lang);

  // ── Cross-source confirmation sentence for the market read ──
  const sig = s.signals;
  const sigNote = lean === 0 && sig.polyStrong === 0
    ? tr("advisor.read.sigNone", lang)
    : tr("advisor.read.sigDetail", lang, {
        scalpLong: sig.scalpLongHigh,
        scalpShort: sig.scalpShortHigh,
        momentum: sig.momentumSurges,
        stockBuy: sig.stockBuyHigh,
        stockSell: sig.stockSellHigh,
        poly: sig.polyStrong,
      });

  // ── Fleet standing sentence for the portfolio read ──
  const { rated, good, weak, paused } = classifyBots(s.bots);
  let fleet: string;
  if (!s.anyBotsOn) {
    fleet = tr("advisor.read.fleetIdle", lang);
  } else if (rated.length === 0) {
    fleet = tr("advisor.read.fleetNoRated", lang);
  } else {
    const pausedNote = paused.length ? tr("advisor.read.fleetPaused", lang, { n: paused.length }) : "";
    fleet = tr("advisor.read.fleetMain", lang, { good: good.length, weak: weak.length, paused: pausedNote });
  }

  // ── Multi-wallet ranking sentence (only when more than one wallet) ──
  let wallet = "";
  if (s.wallets.length > 1) {
    const ranked = [...s.wallets].sort((x, y) => y.cashRatio - x.cashRatio);
    const strongest = ranked[0];
    const exposed = ranked[ranked.length - 1];
    if (strongest && exposed && strongest.id !== exposed.id) {
      wallet = tr("advisor.read.wallet", lang, {
        n: s.wallets.length,
        strong: strongest.name,
        exposed: exposed.name,
      });
    }
  }

  return {
    regime,
    bias,
    conviction,
    tag,
    headline: tr("advisor.read.headline", lang, { tag: lang === "en" ? tag.toLowerCase() : tag }),
    market: tr("advisor.read.market", lang, {
      btc,
      avg,
      fg,
      dir: dirWord(a.direction, lang),
      confluence: a.confluence,
      sources: a.sources,
      sig: sigNote,
    }),
    portfolio: tr("advisor.read.portfolio", lang, {
      cashPct,
      openAuto: s.openAuto,
      daily,
      fleet,
      wallet,
      dd: ddNote,
    }),
  };
}

/** Generate every applicable suggested move, ranked by priority (desc). */
export function buildAdvisorMoves(s: AdvisorSnapshot, lang: Lang): AdvisorMove[] {
  const moves: AdvisorMove[] = [];
  const a = s.alpha;
  const lean = signalLean(s.signals);
  const aligned = a.direction !== "NEUTRAL";
  const confirmed =
    (a.direction === "LONG" && lean >= 2) || (a.direction === "SHORT" && lean <= -2);
  // "Strong" now requires either high alpha confluence OR a decent consensus that
  // the live cross-source signals actively confirm — not alpha alone.
  const strong = aligned && (a.confluence >= 65 || (a.confluence >= 50 && confirmed));
  const healthy = s.cashRatio >= 0.9 && s.dailyRealizedPct > -4 && s.drawdownPct < 12;
  const { weak } = classifyBots(s.bots);
  const weakCount = weak.length;

  // ── CRITICAL: capital protection ──
  if (s.openAuto > 0 && (s.dailyRealizedPct <= -6 || s.drawdownPct >= 18)) {
    moves.push({
      id: "close-bot-positions",
      tone: "critical",
      priority: 100,
      icon: "siren",
      action: { kind: "CLOSE_BOT_POSITIONS" },
      title: tr("advisor.move.close.title", lang),
      body: tr("advisor.move.close.body", lang, { n: s.openAuto }),
      cta: tr("advisor.move.close.cta", lang),
    });
  }

  // Shift to Calculated mode after a red day OR when several bots are struggling.
  const redDay = s.dailyRealizedPct <= -4;
  if (s.anyBotsOn && (redDay || weakCount >= 2) && s.tradeMode !== "CALCULATED") {
    const reason = redDay
      ? tr("advisor.move.calc.reasonRed", lang)
      : tr("advisor.move.calc.reasonWeak", lang, { n: weakCount });
    moves.push({
      id: "calc-mode",
      tone: "critical",
      priority: weakCount >= 2 ? 96 : 94,
      icon: "turtle",
      action: { kind: "SET_TRADE_MODE", tradeMode: "CALCULATED" },
      title: tr("advisor.move.calc.title", lang),
      body: tr("advisor.move.calc.body", lang, { reason }),
      cta: tr("advisor.move.calc.cta", lang),
    });
  }

  if (s.anyBotsOn && s.cashFloorPct < 15 && (s.cashRatio < 0.6 || s.drawdownPct >= 10)) {
    const target = 25;
    moves.push({
      id: `cash-floor-${target}`,
      tone: "critical",
      priority: 90,
      icon: "wallet",
      action: { kind: "SET_CASH_FLOOR", cashFloorPct: target },
      title: tr("advisor.move.cashFloor.title", lang),
      body: tr("advisor.move.cashFloor.body", lang, { n: target }),
      cta: tr("advisor.move.cashFloor.cta", lang, { n: target }),
    });
  }

  if (s.anyBotsOn && !s.riskManagerEnabled) {
    // When specific bots are already losing, this safety layer matters more.
    const urgent = weakCount >= 1;
    const weakNote = urgent ? tr("advisor.move.risk.weakNote", lang, { n: weakCount }) : " ";
    moves.push({
      id: "enable-risk-manager",
      tone: "critical",
      priority: urgent ? 92 : 86,
      icon: "shield",
      action: { kind: "ENABLE_RISK_MANAGER" },
      title: tr("advisor.move.risk.title", lang),
      body: tr("advisor.move.risk.body", lang, { weakNote }),
      cta: tr("advisor.move.risk.cta", lang),
    });
  }

  // ── OPPORTUNITY: act on convergence (only when healthy) ──
  if (strong && healthy && !s.anyBotsOn) {
    const confirmNote = confirmed ? tr("advisor.move.arm.confirmNote", lang) : "";
    moves.push({
      id: "arm-fleet",
      tone: "opportunity",
      priority: 76,
      icon: "rocket",
      action: { kind: "ARM_ALL" },
      title: tr("advisor.move.arm.title", lang),
      body: tr("advisor.move.arm.body", lang, {
        dir: dirWord(a.direction, lang),
        confluence: a.confluence,
        confirm: confirmNote,
      }),
      cta: tr("advisor.move.arm.cta", lang),
    });
  }

  if (strong && healthy && s.anyBotsOn && s.intensity < 4 && s.tradeMode === "NORMAL") {
    const next = Math.min(5, s.intensity + 1);
    moves.push({
      id: `intensity-up-${next}`,
      tone: "opportunity",
      priority: 64,
      icon: "gauge",
      action: { kind: "SET_INTENSITY", intensity: next },
      title: tr("advisor.move.intUp.title", lang),
      body: tr("advisor.move.intUp.body", lang, { n: next }),
      cta: tr("advisor.move.intUp.cta", lang, { n: next }),
    });
  }

  // ── TUNE: housekeeping / hygiene ──
  if (s.anyBotsOn && !aligned && s.intensity > 2 && s.tradeMode === "NORMAL") {
    const next = Math.max(1, s.intensity - 1);
    moves.push({
      id: `intensity-down-${next}`,
      tone: "tune",
      priority: 68,
      icon: "turtle",
      action: { kind: "SET_INTENSITY", intensity: next },
      title: tr("advisor.move.intDown.title", lang),
      body: tr("advisor.move.intDown.body", lang, { n: next }),
      cta: tr("advisor.move.intDown.cta", lang, { n: next }),
    });
  }

  if (s.anyBotsOn && s.cashFloorPct === 0) {
    const target = 15;
    moves.push({
      id: `cash-floor-base-${target}`,
      tone: "tune",
      priority: 54,
      icon: "wallet",
      action: { kind: "SET_CASH_FLOOR", cashFloorPct: target },
      title: tr("advisor.move.cashBase.title", lang),
      body: tr("advisor.move.cashBase.body", lang, { n: target }),
      cta: tr("advisor.move.cashFloor.cta", lang, { n: target }),
    });
  }

  if (s.anyBotsOn && !s.alphaEnabled) {
    moves.push({
      id: "enable-alpha",
      tone: "tune",
      priority: 48,
      icon: "brain",
      action: { kind: "ENABLE_ALPHA" },
      title: tr("advisor.move.alpha.title", lang),
      body: tr("advisor.move.alpha.body", lang),
      cta: tr("advisor.move.alpha.cta", lang),
    });
  }

  if (s.anyBotsOn && !s.smartExitEnabled) {
    moves.push({
      id: "enable-smart-exit",
      tone: "tune",
      priority: 44,
      icon: "scissors",
      action: { kind: "ENABLE_SMART_EXIT" },
      title: tr("advisor.move.smartExit.title", lang),
      body: tr("advisor.move.smartExit.body", lang),
      cta: tr("advisor.move.smartExit.cta", lang),
    });
  }

  if (s.anyBotsOn && !s.dailyStopEnabled) {
    moves.push({
      id: "enable-daily-stop",
      tone: "tune",
      priority: 40,
      icon: "shield",
      action: { kind: "ENABLE_DAILY_STOP" },
      title: tr("advisor.move.dailyStop.title", lang),
      body: tr("advisor.move.dailyStop.body", lang),
      cta: tr("advisor.move.dailyStop.cta", lang),
    });
  }

  if (healthy && strong && s.anyBotsOn && !s.autoPilotOn) {
    moves.push({
      id: "enable-autopilot",
      tone: "tune",
      priority: 34,
      icon: "sparkles",
      action: { kind: "ENABLE_AUTOPILOT" },
      title: tr("advisor.move.autopilot.title", lang),
      body: tr("advisor.move.autopilot.body", lang),
      cta: tr("advisor.move.autopilot.cta", lang),
    });
  }

  return moves.sort((x, y) => y.priority - x.priority);
}
