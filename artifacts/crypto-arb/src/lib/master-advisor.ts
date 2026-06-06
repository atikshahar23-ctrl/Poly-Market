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

export interface LocalizedText {
  title: string;
  body: string;
  cta: string;
}

export interface AdvisorMove {
  /** Stable id (kind + params) so dismissal survives re-renders. */
  id: string;
  tone: MoveTone;
  /** Higher = more urgent; the page sorts and caps the list by this. */
  priority: number;
  icon: AdvisorIcon;
  he: LocalizedText;
  en: LocalizedText;
  action: AdvisorActionSpec;
}

export interface AdvisorRead {
  regime: Regime;
  /** -100 (deeply risk-off) … +100 (deeply risk-on). */
  bias: number;
  /** 0…100 conviction in the read. */
  conviction: number;
  he: { tag: string; headline: string; market: string; portfolio: string };
  en: { tag: string; headline: string; market: string; portfolio: string };
}

/** One bot's standing, mirrored from the Bot Command fleet roll-up. */
export interface AdvisorBot {
  key: string;
  he: string;
  en: string;
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

function dirWord(d: AlphaState["direction"], lang: Lang): string {
  if (d === "LONG") return lang === "he" ? "כיוון עולה" : "an upward lean";
  if (d === "SHORT") return lang === "he" ? "כיוון יורד" : "a downward lean";
  return lang === "he" ? "ללא הכרעה ברורה" : "no clear lean";
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
export function buildAdvisorRead(s: AdvisorSnapshot): AdvisorRead {
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

  const heTag = regime === "RISK_ON" ? "סביבת סיכון חיובית" : regime === "RISK_OFF" ? "סביבת סיכון שלילית" : "תמונה מעורבת";
  const enTag = regime === "RISK_ON" ? "Risk-on backdrop" : regime === "RISK_OFF" ? "Risk-off backdrop" : "Mixed picture";

  const ddNote_he = s.drawdownPct >= 12
    ? `שים לב — ירידת ערך מוערכת של כ-${s.drawdownPct.toFixed(0)} אחוז מההפקדה.`
    : "ירידת הערך עדיין מתונה.";
  const ddNote_en = s.drawdownPct >= 12
    ? `Heads up — estimated drawdown of about ${s.drawdownPct.toFixed(0)} percent from deposits.`
    : "Drawdown is still mild.";

  // ── Cross-source confirmation sentence for the market read ──
  const sig = s.signals;
  const sigNote_he = lean === 0 && sig.polyStrong === 0
    ? "כרגע אין סיגנל בולט שמושך לכיוון אחד."
    : `על פני המקורות אני רואה ${sig.scalpLongHigh} סקאלפ בכיוון עולה ו-${sig.scalpShortHigh} בכיוון יורד, ${sig.momentumSurges} זינוקי מומנטום, ${sig.stockBuyHigh} מניות לקנייה מול ${sig.stockSellHigh} למכירה, ו-${sig.polyStrong} שווקי תחזיות עם הכרעה ברורה.`;
  const sigNote_en = lean === 0 && sig.polyStrong === 0
    ? "Right now no single signal is pulling hard in one direction."
    : `Across the feeds I see ${sig.scalpLongHigh} scalp setups leaning up and ${sig.scalpShortHigh} leaning down, ${sig.momentumSurges} momentum surges, ${sig.stockBuyHigh} stocks flagged buy versus ${sig.stockSellHigh} sell, and ${sig.polyStrong} prediction markets pricing a clear outcome.`;

  // ── Fleet standing sentence for the portfolio read ──
  const { rated, good, weak, paused } = classifyBots(s.bots);
  let fleet_he: string;
  let fleet_en: string;
  if (!s.anyBotsOn) {
    fleet_he = "כל הבוטים כבויים כרגע.";
    fleet_en = "All bots are currently idle.";
  } else if (rated.length === 0) {
    fleet_he = "הצי פעיל אך עוד אין מספיק עסקאות סגורות כדי לדרג ביצועים.";
    fleet_en = "The fleet is live but there aren't enough closed trades yet to rate performance.";
  } else {
    const pausedNote_he = paused.length ? `, ${paused.length} מושהים על ידי מנהל הסיכונים` : "";
    const pausedNote_en = paused.length ? `, ${paused.length} paused by the Risk Manager` : "";
    fleet_he = `הצי: ${good.length} בוטים במצב טוב, ${weak.length} זקוקים לתשומת לב${pausedNote_he}.`;
    fleet_en = `Fleet: ${good.length} bots in good shape, ${weak.length} needing attention${pausedNote_en}.`;
  }

  // ── Multi-wallet ranking sentence (only when more than one wallet) ──
  let wallet_he = "";
  let wallet_en = "";
  if (s.wallets.length > 1) {
    const ranked = [...s.wallets].sort((x, y) => y.cashRatio - x.cashRatio);
    const strongest = ranked[0];
    const exposed = ranked[ranked.length - 1];
    if (strongest && exposed && strongest.id !== exposed.id) {
      wallet_he = ` מבין ${s.wallets.length} הארנקים, הכי הרבה מזומן פנוי יש בארנק ${strongest.name}, והכי חשוף הוא ${exposed.name}.`;
      wallet_en = ` Across ${s.wallets.length} wallets, the most free cash sits in ${strongest.name}, and the most exposed is ${exposed.name}.`;
    }
  }

  return {
    regime,
    bias,
    conviction,
    he: {
      tag: heTag,
      headline: `קראתי את כל הזירה — ${heTag}.`,
      market: `ביטקוין ${btc} ביממה, רוחב השוק ${avg}, ומדד הסנטימנט עומד על ${fg}. הקונצנזוס של המערכת מצביע על ${dirWord(a.direction, "he")} במתאם של ${a.confluence} אחוז על פני ${a.sources} מקורות סיגנל. ${sigNote_he}`,
      portfolio: `בארנק הפעיל יש כ-${cashPct} אחוז מזומן פנוי, ${s.openAuto} פוזיציות בוט פתוחות, ותוצאה יומית ממומשת של ${daily}. ${fleet_he}${wallet_he} ${ddNote_he}`,
    },
    en: {
      tag: enTag,
      headline: `I've read the whole board — ${enTag.toLowerCase()}.`,
      market: `Bitcoin ${btc} on the day, market breadth ${avg}, and the sentiment gauge sits at ${fg}. The system's consensus shows ${dirWord(a.direction, "en")} at ${a.confluence} percent confluence across ${a.sources} signal sources. ${sigNote_en}`,
      portfolio: `The active wallet holds about ${cashPct} percent free cash, ${s.openAuto} open bot positions, and a realized result today of ${daily}. ${fleet_en}${wallet_en} ${ddNote_en}`,
    },
  };
}

/** Generate every applicable suggested move, ranked by priority (desc). */
export function buildAdvisorMoves(s: AdvisorSnapshot): AdvisorMove[] {
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
      he: {
        title: "להקטין חשיפה עכשיו",
        body: `ההפסד היום והירידה בערך מצטברים. תרחיש להגנת הון: לסגור את כל פוזיציות הבוט הפתוחות (${s.openAuto}) ולחזור למזומן. זו פעולה חינוכית בלבד.`,
        cta: "סגור את כל פוזיציות הבוט",
      },
      en: {
        title: "Reduce exposure now",
        body: `Today's loss and the equity dip are adding up. A capital-protection scenario: close every open bot position (${s.openAuto}) and step back to cash. Educational action only.`,
        cta: "Close all bot positions",
      },
    });
  }

  // Shift to Calculated mode after a red day OR when several bots are struggling.
  const redDay = s.dailyRealizedPct <= -4;
  if (s.anyBotsOn && (redDay || weakCount >= 2) && s.tradeMode !== "CALCULATED") {
    const reason_he = redDay
      ? "אחרי יום אדום"
      : `${weakCount} מהבוטים שלך מתקשים`;
    const reason_en = redDay
      ? "After a red day"
      : `${weakCount} of your bots are struggling`;
    moves.push({
      id: "calc-mode",
      tone: "critical",
      priority: weakCount >= 2 ? 96 : 94,
      icon: "turtle",
      action: { kind: "SET_TRADE_MODE", tradeMode: "CALCULATED" },
      he: {
        title: "לעבור למצב מחושב",
        body: `${reason_he}, מצב מחושב הופך את כל הצי לסבלני ובררן הרבה יותר — פחות עסקאות, סף כניסה גבוה יותר, ושמירה על רווחים לאורך זמן.`,
        cta: "הפעל מצב מחושב",
      },
      en: {
        title: "Shift to Calculated mode",
        body: `${reason_en}, Calculated mode makes the whole fleet far more patient and selective — fewer trades, a higher entry bar, and longer holds on winners.`,
        cta: "Enable Calculated mode",
      },
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
      he: {
        title: "להעלות את רזרבת המזומן",
        body: `המזומן הפנוי דק יחסית. תרחיש הגנתי: להעלות את רצפת המזומן ל-${target} אחוז כך שהבוטים לעולם לא ירוצו את החשבון עד הסוף.`,
        cta: `קבע רזרבת מזומן ${target} אחוז`,
      },
      en: {
        title: "Raise the cash reserve",
        body: `Free cash is getting thin. A defensive scenario: lift the cash floor to ${target} percent so the bots never run the account down to nothing.`,
        cta: `Set ${target} percent cash reserve`,
      },
    });
  }

  if (s.anyBotsOn && !s.riskManagerEnabled) {
    // When specific bots are already losing, this safety layer matters more.
    const urgent = weakCount >= 1;
    const weakNote_he = urgent ? ` כבר ${weakCount} בוטים מפסידים — ` : " ";
    const weakNote_en = urgent ? ` Already ${weakCount} bots are losing — ` : " ";
    moves.push({
      id: "enable-risk-manager",
      tone: "critical",
      priority: urgent ? 92 : 86,
      icon: "shield",
      action: { kind: "ENABLE_RISK_MANAGER" },
      he: {
        title: "להדליק את מנהל הסיכונים",
        body: `הבוטים פעילים אך מנהל הסיכונים כבוי.${weakNote_he}הוא משהה אוטומטית בוט שמפסיד ברצף או חוצה גבול הפסד יומי — שכבת הגנה בסיסית.`,
        cta: "הדלק מנהל סיכונים",
      },
      en: {
        title: "Turn on the Risk Manager",
        body: `Bots are live but the Risk Manager is off.${weakNote_en}It auto-pauses a bot on a losing streak or a daily-loss breach — a baseline safety layer.`,
        cta: "Enable Risk Manager",
      },
    });
  }

  // ── OPPORTUNITY: act on convergence (only when healthy) ──
  if (strong && healthy && !s.anyBotsOn) {
    const confirmNote_he = confirmed ? " הסיגנלים החיים מאשרים את הכיוון." : "";
    const confirmNote_en = confirmed ? " The live signals confirm the direction." : "";
    moves.push({
      id: "arm-fleet",
      tone: "opportunity",
      priority: 76,
      icon: "rocket",
      action: { kind: "ARM_ALL" },
      he: {
        title: "להפעיל את הצי על ההתכנסות",
        body: `המקורות מתכנסים ל${dirWord(a.direction, "he")} במתאם ${a.confluence} אחוז והארנק במצב בריא.${confirmNote_he} תרחיש ללימוד: לחמש את כל הבוטים כדי לפעול על ההסכמה.`,
        cta: "הפעל את כל הבוטים",
      },
      en: {
        title: "Arm the fleet on convergence",
        body: `Sources are converging on ${dirWord(a.direction, "en")} at ${a.confluence} percent confluence and the wallet is healthy.${confirmNote_en} A learning scenario: arm the bots to act on the agreement.`,
        cta: "Arm all bots",
      },
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
      he: {
        title: "להעלות הילוך מסחר",
        body: `ההתכנסות חזקה והתיק בריא. תרחיש: להעלות את הילוך המסחר לדרגה ${next} כדי לפעול מעט יותר על ההזדמנות.`,
        cta: `העלה הילוך לדרגה ${next}`,
      },
      en: {
        title: "Raise the trading gear",
        body: `Convergence is strong and the book is healthy. Scenario: move the trading gear up to level ${next} to lean a little more into the opportunity.`,
        cta: `Raise gear to level ${next}`,
      },
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
      he: {
        title: "להוריד הילוך בשוק מבולבל",
        body: `אין כרגע הכרעה בין המקורות. בשוק ללא כיוון ברור, תרחיש שמרני הוא להוריד את הילוך המסחר לדרגה ${next} ולסחור פחות.`,
        cta: `הורד הילוך לדרגה ${next}`,
      },
      en: {
        title: "Ease the gear in a choppy tape",
        body: `Sources aren't agreeing right now. With no clear direction, a conservative scenario is to drop the trading gear to level ${next} and trade less.`,
        cta: `Lower gear to level ${next}`,
      },
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
      he: {
        title: "להגדיר רזרבת מזומן",
        body: `אין כרגע רצפת מזומן מוגדרת. תרחיש בסיסי לניהול הון: לשמור ${target} אחוז מהחשבון תמיד פנויים.`,
        cta: `קבע רזרבת מזומן ${target} אחוז`,
      },
      en: {
        title: "Set a cash reserve",
        body: `There's no cash floor set. A basic money-management scenario: always keep ${target} percent of the account free.`,
        cta: `Set ${target} percent cash reserve`,
      },
    });
  }

  if (s.anyBotsOn && !s.alphaEnabled) {
    moves.push({
      id: "enable-alpha",
      tone: "tune",
      priority: 48,
      icon: "brain",
      action: { kind: "ENABLE_ALPHA" },
      he: {
        title: "להדליק את מתאם האלפא",
        body: "מתאם האלפא מאחד את הסיגנלים לכיוון אחד ומאפשר לבוטים לפעול כמערך מתואם — כניסות קלות יותר כשמסכימים, מחמירות יותר כשמתנגדים.",
        cta: "הדלק מתאם אלפא",
      },
      en: {
        title: "Turn on the Alpha Coordinator",
        body: "The Alpha Coordinator fuses signals into one direction so the bots act as a coordinated formation — easier entries when aligned, stricter when fighting it.",
        cta: "Enable Alpha Coordinator",
      },
    });
  }

  if (s.anyBotsOn && !s.smartExitEnabled) {
    moves.push({
      id: "enable-smart-exit",
      tone: "tune",
      priority: 44,
      icon: "scissors",
      action: { kind: "ENABLE_SMART_EXIT" },
      he: {
        title: "להדליק סגירה חכמה",
        body: "סגירה חכמה נועלת רווחים קטנים מהר אך נותנת לעסקאות חזקות לרוץ. שכבת ניהול יציאה בסיסית לכל עסקאות הקריפטו של הבוטים.",
        cta: "הדלק סגירה חכמה",
      },
      en: {
        title: "Turn on Smart Exit",
        body: "Smart Exit banks small wins fast but lets strong trades run. A baseline exit-management layer for all the bots' crypto trades.",
        cta: "Enable Smart Exit",
      },
    });
  }

  if (s.anyBotsOn && !s.dailyStopEnabled) {
    moves.push({
      id: "enable-daily-stop",
      tone: "tune",
      priority: 40,
      icon: "shield",
      action: { kind: "ENABLE_DAILY_STOP" },
      he: {
        title: "להדליק עצירת הפסד יומית",
        body: "עצירת הפסד יומית מפסיקה לפתוח עסקאות חדשות אחרי שההפסד היומי חוצה את הסף — בלם פשוט לימים גרועים.",
        cta: "הדלק עצירה יומית",
      },
      en: {
        title: "Turn on the daily loss stop",
        body: "The daily loss stop halts new trades once the day's loss crosses the limit — a simple brake for bad days.",
        cta: "Enable daily stop",
      },
    });
  }

  if (healthy && strong && s.anyBotsOn && !s.autoPilotOn) {
    moves.push({
      id: "enable-autopilot",
      tone: "tune",
      priority: 34,
      icon: "sparkles",
      action: { kind: "ENABLE_AUTOPILOT" },
      he: {
        title: "להעביר לטייס אוטומטי",
        body: "התנאים יציבים. תרחיש להתנסות: להפעיל טייס אוטומטי — המערכת קובעת לבד גודל עסקה, מינוף, SL/TP וכל שכבות הניהול. סימולציה בלבד.",
        cta: "הפעל טייס אוטומטי",
      },
      en: {
        title: "Hand over to Auto-Pilot",
        body: "Conditions are steady. A scenario to try: enable Auto-Pilot — the system sizes trades, leverage, SL/TP and runs the full management stack itself. Simulation only.",
        cta: "Enable Auto-Pilot",
      },
    });
  }

  return moves.sort((x, y) => y.priority - x.priority);
}
