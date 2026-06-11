import { useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import {
  Settings as SettingsIcon,
  Languages,
  ShieldCheck,
  Sparkles,
  Eye,
  GraduationCap,
  AlertTriangle,
  Info,
  Check,
  Key,
  Link,
  Link2Off,
  Shield,
  Wallet as WalletIcon,
  Zap,
  LogOut,
  Trash2,
} from "lucide-react";
import { WalletSwitcher } from "@/components/wallet-switcher";
import { useLanguage } from "@/contexts/language-context";
import { useAutoTrader, type AutoTraderSettings } from "@/contexts/autotrader-context";
import { usePortfolio } from "@/contexts/portfolio-context";
import { useServerSync } from "@/contexts/server-sync-context";
import { t } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useGetBinanceCredentials,
  usePutBinanceCredentials,
  useDeleteBinanceCredentials,
  useGetBinanceFuturesStatus,
  usePutBinanceFuturesCredentials,
  useDeleteBinanceFuturesCredentials,
  usePatchBinanceFuturesConfig,
  useDeleteAccount,
} from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MOTION_KEY = "hg.reduceMotion";

type RiskProfileId = "conservative" | "balanced" | "aggressive";

/** Protective preset bundles. Every profile keeps the safety nets ON — the
 *  difference is cadence, leverage, and how much cash is held in reserve. */
const RISK_PROFILES: Record<RiskProfileId, Partial<AutoTraderSettings>> = {
  conservative: {
    leverage: 2,
    globalLeverage: 2,
    newBotLeverage: 2,
    cashFloorPct: 25,
    intensity: 1,
    maxOpenPositions: 3,
    minConfidence: "HIGH",
    dailyStopEnabled: true,
    dailyMaxLossPct: 6,
    portfolioStopEnabled: true,
    portfolioMaxDrawdownPct: 15,
    catastrophicExitEnabled: true,
    maxLossPerTradePct: 25,
    smartExitEnabled: true,
    riskManagerEnabled: true,
    assetCautionEnabled: true,
  },
  balanced: {
    leverage: 3,
    globalLeverage: 3,
    newBotLeverage: 3,
    cashFloorPct: 20,
    intensity: 2,
    maxOpenPositions: 5,
    minConfidence: "HIGH",
    dailyStopEnabled: true,
    dailyMaxLossPct: 8,
    portfolioStopEnabled: true,
    portfolioMaxDrawdownPct: 20,
    catastrophicExitEnabled: true,
    maxLossPerTradePct: 30,
    smartExitEnabled: true,
    riskManagerEnabled: true,
    assetCautionEnabled: true,
  },
  aggressive: {
    leverage: 5,
    globalLeverage: 5,
    newBotLeverage: 5,
    cashFloorPct: 10,
    intensity: 4,
    maxOpenPositions: 8,
    minConfidence: "MEDIUM",
    dailyStopEnabled: true,
    dailyMaxLossPct: 12,
    portfolioStopEnabled: true,
    portfolioMaxDrawdownPct: 30,
    catastrophicExitEnabled: true,
    maxLossPerTradePct: 40,
    smartExitEnabled: true,
    riskManagerEnabled: true,
    assetCautionEnabled: true,
  },
};

/** Best-effort guess of which profile the current settings match, for the badge. */
function detectProfile(s: AutoTraderSettings): RiskProfileId | null {
  for (const id of ["conservative", "balanced", "aggressive"] as RiskProfileId[]) {
    const p = RISK_PROFILES[id];
    if (
      s.leverage === p.leverage &&
      s.cashFloorPct === p.cashFloorPct &&
      s.intensity === p.intensity &&
      s.maxOpenPositions === p.maxOpenPositions
    ) {
      return id;
    }
  }
  return null;
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

export default function Settings() {
  const { lang, setLang, dir } = useLanguage();
  const { settings, update } = useAutoTrader();
  const { resetPortfolio } = usePortfolio();
  const sync = useServerSync();
  const { user } = useUser();
  const { signOut } = useClerk();
  const deleteAccount = useDeleteAccount();

  const [reduceMotion, setReduceMotion] = useState(() => {
    try {
      return localStorage.getItem(MOTION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [appliedProfile, setAppliedProfile] = useState<RiskProfileId | null>(null);

  // Binance API key inputs
  const [binanceKey, setBinanceKey] = useState("");
  const [binanceSecret, setBinanceSecret] = useState("");
  const [binanceError, setBinanceError] = useState<string | null>(null);
  const [binanceSuccess, setBinanceSuccess] = useState(false);

  const { data: credStatus, isLoading: credLoading } = useGetBinanceCredentials();
  const putCreds = usePutBinanceCredentials();
  const deleteCreds = useDeleteBinanceCredentials();

  // Live Futures trading
  const [futMode, setFutMode] = useState<"testnet" | "mainnet">("testnet");
  const [futKey, setFutKey] = useState("");
  const [futSecret, setFutSecret] = useState("");
  const [futError, setFutError] = useState<string | null>(null);
  const [futSuccess, setFutSuccess] = useState(false);

  const { data: futStatus, isLoading: futLoading } = useGetBinanceFuturesStatus();
  const putFutCreds = usePutBinanceFuturesCredentials();
  const deleteFutCreds = useDeleteBinanceFuturesCredentials();
  const patchFutConfig = usePatchBinanceFuturesConfig();
  const futEnv = futStatus ? futStatus[futMode] : undefined;

  const activeProfile = detectProfile(settings);

  function applyProfile(id: RiskProfileId) {
    update(RISK_PROFILES[id]);
    setAppliedProfile(id);
    window.setTimeout(() => setAppliedProfile(null), 2200);
  }

  function toggleMotion(v: boolean) {
    setReduceMotion(v);
    try {
      localStorage.setItem(MOTION_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
    document.documentElement.classList.toggle("reduce-motion", v);
  }

  function replayOnboarding() {
    try {
      localStorage.removeItem(`arb_scan_onboarded::${user?.id ?? "anon"}`);
    } catch {
      /* ignore */
    }
    sync.save("onboarding", { completed: false });
    window.location.reload();
  }

  function doReset() {
    resetPortfolio();
  }

  const profiles: { id: RiskProfileId; name: string; desc: string }[] = [
    { id: "conservative", name: t("set.risk.conservative", lang), desc: t("set.risk.conservativeDesc", lang) },
    { id: "balanced", name: t("set.risk.balanced", lang), desc: t("set.risk.balancedDesc", lang) },
    { id: "aggressive", name: t("set.risk.aggressive", lang), desc: t("set.risk.aggressiveDesc", lang) },
  ];

  return (
    <div dir={dir} className="relative min-h-dvh p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("set.title", lang)}</h1>
          <p className="text-xs text-muted-foreground">{t("set.subtitle", lang)}</p>
        </div>
      </div>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="h-4 w-4 text-primary" />
            {t("set.language.title", lang)}
          </CardTitle>
          <CardDescription>{t("set.language.desc", lang)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={lang === "he" ? "default" : "outline"}
              onClick={() => setLang("he")}
              className="flex-1"
            >
              {t("set.language.he", lang)}
            </Button>
            <Button
              variant={lang === "en" ? "default" : "outline"}
              onClick={() => setLang("en")}
              className="flex-1"
            >
              {t("set.language.en", lang)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallet management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletIcon className="h-4 w-4 text-primary" />
            {t("set.wallet.title", lang)}
          </CardTitle>
          <CardDescription>{t("set.wallet.desc", lang)}</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletSwitcher />
        </CardContent>
      </Card>

      {/* Risk profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("set.risk.title", lang)}
          </CardTitle>
          <CardDescription>{t("set.risk.desc", lang)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.map((p) => {
            const isActive = activeProfile === p.id;
            const justApplied = appliedProfile === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isActive ? "border-primary/50 bg-primary/5" : "border-border bg-card/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    {isActive && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t("set.risk.active", lang)}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isActive ? "outline" : "default"}
                    onClick={() => applyProfile(p.id)}
                  >
                    {justApplied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        {t("set.risk.applied", lang)}
                      </>
                    ) : (
                      t("set.risk.apply", lang)
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{p.desc}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Capital protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t("set.protection.title", lang)}
          </CardTitle>
          <CardDescription>{t("set.protection.desc", lang)}</CardDescription>
        </CardHeader>
        <CardContent className="py-0">
          <ToggleRow
            label={t("set.protection.riskManager", lang)}
            desc={t("set.protection.riskManagerDesc", lang)}
            checked={settings.riskManagerEnabled}
            onChange={(v) => update({ riskManagerEnabled: v })}
          />
          <ToggleRow
            label={t("set.protection.dailyStop", lang)}
            desc={t("set.protection.dailyStopDesc", lang)}
            checked={settings.dailyStopEnabled}
            onChange={(v) => update({ dailyStopEnabled: v })}
          />
          <ToggleRow
            label={t("set.protection.portfolioStop", lang)}
            desc={t("set.protection.portfolioStopDesc", lang)}
            checked={settings.portfolioStopEnabled}
            onChange={(v) => update({ portfolioStopEnabled: v })}
          />
          <ToggleRow
            label={t("set.protection.catastrophic", lang)}
            desc={t("set.protection.catastrophicDesc", lang)}
            checked={settings.catastrophicExitEnabled}
            onChange={(v) => update({ catastrophicExitEnabled: v })}
          />
          <ToggleRow
            label={t("set.protection.smartExit", lang)}
            desc={t("set.protection.smartExitDesc", lang)}
            checked={settings.smartExitEnabled}
            onChange={(v) => update({ smartExitEnabled: v })}
          />
          <ToggleRow
            label={t("set.protection.assetCaution", lang)}
            desc={t("set.protection.assetCautionDesc", lang)}
            checked={settings.assetCautionEnabled}
            onChange={(v) => update({ assetCautionEnabled: v })}
          />
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-primary" />
            {t("set.appearance.title", lang)}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <ToggleRow
            label={t("set.appearance.reduceMotion", lang)}
            desc={t("set.appearance.reduceMotionDesc", lang)}
            checked={reduceMotion}
            onChange={toggleMotion}
          />
        </CardContent>
      </Card>

      {/* Binance API connection */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4 text-primary" />
              {t("set.binance.title", lang)}
              {credStatus?.connected && (
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <Link className="h-3 w-3 mr-1" />
                  {t("set.binance.connected", lang)}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t("set.binance.desc", lang)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {credLoading ? (
              <p className="text-sm text-muted-foreground">{t("nav.apiLoading", lang)}</p>
            ) : credStatus?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-3">
                  <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{credStatus.key}</p>
                    <p className="text-xs text-muted-foreground">{t("set.binance.masked", lang)} · {t("set.binance.readOnly", lang)}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setBinanceError(null);
                    setBinanceSuccess(false);
                    deleteCreds.mutate(undefined, {
                      onSuccess: () => {
                        setBinanceKey("");
                        setBinanceSecret("");
                      },
                      onError: () => setBinanceError(t("set.binance.errorDelete", lang)),
                    });
                  }}
                  disabled={deleteCreds.isPending}
                >
                  <Link2Off className="h-4 w-4 mr-2" />
                  {deleteCreds.isPending ? t("set.binance.delete", lang) + "..." : t("set.binance.delete", lang)}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("set.binance.keyLabel", lang)}</label>
                  <Input
                    type="text"
                    value={binanceKey}
                    onChange={(e) => { setBinanceKey(e.target.value); setBinanceError(null); setBinanceSuccess(false); }}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    autoComplete="off"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("set.binance.secretLabel", lang)}</label>
                  <Input
                    type="password"
                    value={binanceSecret}
                    onChange={(e) => { setBinanceSecret(e.target.value); setBinanceError(null); setBinanceSuccess(false); }}
                    placeholder="••••••••••••••••"
                    autoComplete="off"
                    dir="ltr"
                  />
                </div>
                {binanceError && (
                  <p className="text-xs text-destructive">{binanceError}</p>
                )}
                {binanceSuccess && (
                  <p className="text-xs text-emerald-500">{t("set.binance.saved", lang)}</p>
                )}
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    if (!binanceKey.trim() || !binanceSecret.trim()) {
                      setBinanceError(t("set.binance.errorSave", lang));
                      return;
                    }
                    setBinanceError(null);
                    setBinanceSuccess(false);
                    putCreds.mutate(
                      { data: { apiKey: binanceKey.trim(), secret: binanceSecret.trim() } },
                      {
                        onSuccess: () => {
                          setBinanceSuccess(true);
                          setBinanceKey("");
                          setBinanceSecret("");
                        },
                        onError: (err) => {
                          const msg = (err as Error)?.message || t("set.binance.errorSave", lang);
                          setBinanceError(msg);
                        },
                      }
                    );
                  }}
                  disabled={putCreds.isPending}
                >
                  <Key className="h-4 w-4 mr-2" />
                  {putCreds.isPending ? t("set.binance.save", lang) + "..." : t("set.binance.save", lang)}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Futures trading */}
      {user && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" />
              {t("live.title", lang)}
              {futEnv?.connected && futEnv?.liveTradingEnabled && (
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  {t("live.armed", lang)}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t("live.desc", lang)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 dark:text-amber-400">{t("live.warning", lang)}</p>
            </div>

            {/* Environment selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("live.mode", lang)}</label>
              <Select value={futMode} onValueChange={(v) => { setFutMode(v as "testnet" | "mainnet"); setFutError(null); setFutSuccess(false); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="testnet">{t("live.mode.testnet", lang)}</SelectItem>
                  <SelectItem value="mainnet">{t("live.mode.mainnet", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {futLoading ? (
              <p className="text-sm text-muted-foreground">{t("nav.apiLoading", lang)}</p>
            ) : futEnv?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-3">
                  <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{futEnv.key}</p>
                    <p className="text-xs text-muted-foreground">{t("set.binance.masked", lang)}</p>
                  </div>
                </div>

                {/* Live trading enable toggle */}
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{t("live.enableLabel", lang)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("live.enableDesc", lang)}</p>
                  </div>
                  <Switch
                    checked={!!futEnv.liveTradingEnabled}
                    onCheckedChange={(v) => {
                      setFutError(null);
                      patchFutConfig.mutate(
                        { data: { mode: futMode, liveMode: futMode, liveTradingEnabled: v } },
                        { onError: () => setFutError(t("live.errorSave", lang)) }
                      );
                    }}
                    disabled={patchFutConfig.isPending}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setFutError(null);
                    setFutSuccess(false);
                    deleteFutCreds.mutate(
                      { params: { mode: futMode } },
                      {
                        onSuccess: () => { setFutKey(""); setFutSecret(""); },
                        onError: () => setFutError(t("live.errorDelete", lang)),
                      }
                    );
                  }}
                  disabled={deleteFutCreds.isPending}
                >
                  <Link2Off className="h-4 w-4 mr-2" />
                  {deleteFutCreds.isPending ? t("live.delete", lang) + "..." : t("live.delete", lang)}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("live.keyLabel", lang)}</label>
                  <Input
                    type="text"
                    value={futKey}
                    onChange={(e) => { setFutKey(e.target.value); setFutError(null); setFutSuccess(false); }}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    autoComplete="off"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("live.secretLabel", lang)}</label>
                  <Input
                    type="password"
                    value={futSecret}
                    onChange={(e) => { setFutSecret(e.target.value); setFutError(null); setFutSuccess(false); }}
                    placeholder="••••••••••••••••"
                    autoComplete="off"
                    dir="ltr"
                  />
                </div>
                {futError && <p className="text-xs text-destructive">{futError}</p>}
                {futSuccess && <p className="text-xs text-emerald-500">{t("live.saved", lang)}</p>}
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    if (!futKey.trim() || !futSecret.trim()) {
                      setFutError(t("live.errorSave", lang));
                      return;
                    }
                    setFutError(null);
                    setFutSuccess(false);
                    putFutCreds.mutate(
                      { data: { mode: futMode, apiKey: futKey.trim(), secret: futSecret.trim() } },
                      {
                        onSuccess: () => { setFutSuccess(true); setFutKey(""); setFutSecret(""); },
                        onError: (err) => setFutError((err as Error)?.message || t("live.errorSave", lang)),
                      }
                    );
                  }}
                  disabled={putFutCreds.isPending}
                >
                  <Key className="h-4 w-4 mr-2" />
                  {putFutCreds.isPending ? t("live.save", lang) + "..." : t("live.save", lang)}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Onboarding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-primary" />
            {t("set.onboarding.title", lang)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t("set.onboarding.replay", lang)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("set.onboarding.replayDesc", lang)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={replayOnboarding} className="shrink-0">
              {t("set.onboarding.replayBtn", lang)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t("set.danger.title", lang)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t("set.danger.resetTitle", lang)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("set.danger.resetDesc", lang)}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0">
                  {t("set.danger.resetBtn", lang)}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir={dir}>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("set.danger.confirmTitle", lang)}</AlertDialogTitle>
                  <AlertDialogDescription>{t("set.danger.confirmBody", lang)}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("set.danger.confirmCancel", lang)}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={doReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("set.danger.confirmOk", lang)}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Account management — sign-out + delete account */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              {t("nav.privateOffice", lang)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sign Out */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t("set.account.signOut", lang)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("set.account.signOutDesc", lang)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => signOut({ redirectUrl: "/" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("set.account.signOut", lang)}
              </Button>
            </div>

            {/* Delete Account */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t("set.account.deleteTitle", lang)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("set.account.deleteDesc", lang)}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="shrink-0">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("set.account.deleteBtn", lang)}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir={dir}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("set.account.confirmTitle", lang)}</AlertDialogTitle>
                    <AlertDialogDescription>{t("set.account.confirmBody", lang)}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("set.account.confirmCancel", lang)}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteAccount.mutate(undefined, {
                          onSuccess: () => {
                            // Force a hard reload after Clerk account deletion
                            window.location.href = "/";
                          },
                        });
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteAccount.isPending}
                    >
                      {deleteAccount.isPending ? "..." : t("set.account.confirmOk", lang)}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* About / disclaimer */}
      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/30 p-4">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">{t("set.about.disclaimer", lang)}</p>
      </div>
    </div>
  );
}
