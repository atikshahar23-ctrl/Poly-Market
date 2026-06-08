import React, { useState } from "react";
import "./_group.css";
import { 
  LayoutDashboard, LineChart, Cpu, Bot, GraduationCap,
  Activity, Zap, Clock, ShieldAlert,
  Wallet, RefreshCw, AlertCircle, TrendingUp, TrendingDown,
  ChevronLeft, BarChart2, ShieldCheck, Target, Crosshair, 
  Lightbulb, BrainCircuit, BookOpen
} from "lucide-react";

export function Cockpit() {
  return (
    <div dir="rtl" className="lux-theme min-h-screen flex font-sans selection:bg-[var(--gold-500)] selection:text-black">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col lux-panel border-r-0 border-l z-10 relative data-grid">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <img src="/__mockup/images/brand-logo.png" alt="Heavy Guard" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
          <span className="font-['Playfair_Display'] font-bold text-xl tracking-wider text-white">
            HEAVY<span className="lux-text-gold">GUARD</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          <NavGroup title="כללי">
            <NavItem icon={<LayoutDashboard size={18} />} label="לוח בקרה" active />
          </NavGroup>

          <NavGroup title="שווקים">
            <NavItem icon={<LineChart size={18} />} label="קריפטו" />
            <NavItem icon={<BarChart2 size={18} />} label="מניות" />
            <NavItem icon={<Activity size={18} />} label="מוברים" />
            <NavItem icon={<Clock size={18} />} label="שווקים חיים" />
          </NavGroup>

          <NavGroup title="סיגנלים ו-AI">
            <NavItem icon={<Zap size={18} />} label="סקאלפ" />
            <NavItem icon={<TrendingUp size={18} />} label="מומנטום" />
            <NavItem icon={<Crosshair size={18} />} label="Funding Arb" />
            <NavItem icon={<Target size={18} />} label="Quick Bets" />
            <NavItem icon={<BrainCircuit size={18} />} label="Smart Money" />
            <NavItem icon={<Lightbulb size={18} />} label="המלצות" />
            <NavItem icon={<ShieldCheck size={18} />} label="יועץ ראשי" />
          </NavGroup>

          <NavGroup title="אוטומציה">
            <NavItem icon={<Bot size={18} />} label="מרכז הבוטים" />
            <NavItem icon={<Cpu size={18} />} label="Scalp Squad" />
          </NavGroup>

          <NavGroup title="השולחן שלי">
            <NavItem icon={<LayoutDashboard size={18} />} label="סימולטור" />
            <NavItem icon={<LineChart size={18} />} label="Trade Desk" />
            <NavItem icon={<Activity size={18} />} label="היסטוריה" />
            <NavItem icon={<BarChart2 size={18} />} label="אנליטיקה" />
          </NavGroup>

          <NavGroup title="לימוד ומחקר">
            <NavItem icon={<GraduationCap size={18} />} label="אקדמיה" />
            <NavItem icon={<BookOpen size={18} />} label="מחקר" />
            <NavItem icon={<AlertCircle size={18} />} label="תדריך" />
            <NavItem icon={<Zap size={18} />} label="כלים" />
          </NavGroup>
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--obsidian-800)] p-3 rounded border border-white/5">
            <ShieldAlert size={14} className="text-[var(--gold-500)]" />
            <span>מערכת לימודית (Paper Trading). לא ייעוץ פיננסי.</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[var(--obsidian-900)] carbon-texture">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 lux-panel border-t-0 border-x-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-['Playfair_Display'] text-xl text-white/90">תא הטייס</h1>
            <div className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-[var(--gold-500)]/10 text-[var(--gold-500)] border border-[var(--gold-500)]/30">
              דמו לימודי
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[var(--obsidian-800)] px-3 py-1.5 rounded-full border border-white/10 metallic-shine">
              <BrainCircuit size={14} className="lux-accent-cyan" />
              <span className="text-xs font-bold tracking-wide lux-accent-cyan">JARVIS: ONLINE</span>
            </div>
            
            <div className="flex items-center gap-2 bg-[var(--obsidian-800)] px-3 py-1.5 rounded border border-white/10">
              <RefreshCw size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs font-['Space_Mono'] text-[var(--text-primary)]">15s</span>
            </div>

            <div className="flex items-center gap-3 bg-[var(--obsidian-800)] px-4 py-1.5 rounded border border-[var(--gold-500)]/20">
              <Wallet size={16} className="text-[var(--gold-500)]" />
              <span className="font-['Space_Mono'] font-bold text-white tracking-wider">$100,000.00</span>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard title="שווי תיק (דמו)" value="$104,250.50" change="+4.25%" positive />
            <KPICard title="רווח/הפסד היום" value="+$1,250.00" change="+1.2%" positive />
            <KPICard title="פוזיציות פתוחות" value="8" subtext="3 במגמת עלייה" />
            <KPICard title="מזומן פנוי" value="$45,750.00" subtext="43.8% מהתיק" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* סורק השוק (Market Scanner) */}
            <div className="col-span-8 lux-panel rounded-lg p-5">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-[var(--gold-500)]" />
                  <h2 className="font-['Playfair_Display'] text-lg text-white">סורק השוק המרכזי</h2>
                </div>
                <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan-accent)] animate-pulse" />
                  Binance × Polymarket
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="grid grid-cols-5 text-[11px] text-[var(--text-muted)] uppercase tracking-wider px-2 pb-1 border-b border-white/5">
                  <div className="col-span-1">נכס</div>
                  <div className="col-span-1">מחיר</div>
                  <div className="col-span-1">שינוי (24h)</div>
                  <div className="col-span-1">סנטימנט קהל</div>
                  <div className="col-span-1 text-left">פעולה</div>
                </div>
                
                <MarketRow asset="BTC" name="Bitcoin" price="$64,230.00" change="+2.4%" sentiment="שוררי (68%)" positive />
                <MarketRow asset="ETH" name="Ethereum" price="$3,450.20" change="-0.8%" sentiment="ניטרלי (45%)" />
                <MarketRow asset="SOL" name="Solana" price="$145.80" change="+5.2%" sentiment="שוררי חזק (82%)" positive />
                <MarketRow asset="LINK" name="Chainlink" price="$18.40" change="-2.1%" sentiment="דובי (30%)" />
              </div>
            </div>

            {/* הבוטים שלי (Automation) */}
            <div className="col-span-4 lux-panel rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                <Bot size={18} className="text-[var(--cyan-accent)]" />
                <h2 className="font-['Playfair_Display'] text-lg text-white">הבוטים שלי</h2>
              </div>
              
              <div className="space-y-4">
                <BotStatus name="Dip Buyer" status="ARMED" type="Accumulation" active />
                <BotStatus name="Scalp Squad" status="RUNNING" type="High-Freq" active />
                <BotStatus name="Breakout Hunter" status="STANDBY" type="Momentum" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* סיגנלים חיים (Live Signals) */}
            <div className="col-span-8 lux-panel rounded-lg p-5">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-[var(--gold-500)]" />
                  <h2 className="font-['Playfair_Display'] text-lg text-white">סיגנלים חיים</h2>
                </div>
              </div>
              
              <div className="space-y-3">
                <SignalRow 
                  type="Scalp" 
                  asset="SOL/USDT" 
                  action="LONG" 
                  price="$145.80" 
                  confidence="85%" 
                  why="מומנטום קצר טווח + פריצת התנגדות בנפח מסחר גבוה." 
                />
                <SignalRow 
                  type="Funding Arb" 
                  asset="BTC" 
                  action="HEDGE" 
                  price="--" 
                  confidence="92%" 
                  why="פער חיובי משמעותי בין מחירי ספוט לחוזים עתידיים." 
                />
                <SignalRow 
                  type="Momentum" 
                  asset="ETH/USDT" 
                  action="SHORT" 
                  price="$3,450.20" 
                  confidence="60%" 
                  why="איבוד תמיכה קריטית יחד עם סנטימנט שלילי גובר." 
                  bearish
                />
              </div>
            </div>

            {/* אקדמיה (Academy) */}
            <div className="col-span-4 lux-panel-glow rounded-lg p-5 relative overflow-hidden group cursor-pointer transition-all hover:border-[var(--gold-500)]/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold-500)]/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
              <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                <GraduationCap size={18} className="text-[var(--gold-500)]" />
                <h2 className="font-['Playfair_Display'] text-lg text-[var(--gold-500)]">אקדמיה / למד</h2>
              </div>
              
              <div className="space-y-3 relative z-10">
                <LessonItem title="איך לקרוא את הסורק?" duration="3 דק'" />
                <LessonItem title="מה זה Funding Arb?" duration="5 דק'" />
                <LessonItem title="איך ה-AI מנתח סנטימנט?" duration="4 דק'" />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function NavGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider px-3 mb-2 opacity-70">
        {title}
      </div>
      {children}
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm
      ${active 
        ? "bg-[var(--gold-500)]/10 text-[var(--gold-500)] border border-[var(--gold-500)]/20 shadow-[inset_2px_0_0_var(--gold-500)]" 
        : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"}`}
    >
      <span className={active ? "text-[var(--gold-500)]" : "opacity-70"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function KPICard({ title, value, change, positive, subtext }: { title: string, value: string, change?: string, positive?: boolean, subtext?: string }) {
  return (
    <div className="lux-panel rounded-lg p-4 relative overflow-hidden group">
      <div className="text-xs text-[var(--text-muted)] mb-1 font-medium">{title}</div>
      <div className="font-['Space_Mono'] text-2xl font-bold text-white tracking-tight">{value}</div>
      
      {change && (
        <div className={`text-xs mt-2 font-bold font-['Space_Mono'] flex items-center gap-1
          ${positive ? 'text-[var(--green-profit)]' : 'text-[var(--red-loss)]'}`}
        >
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {change}
        </div>
      )}
      {subtext && (
        <div className="text-[10px] text-[var(--text-muted)] mt-2">{subtext}</div>
      )}
      
      {/* Decorative gauge slice */}
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full border-4 border-[var(--gold-500)]/10 border-t-[var(--cyan-accent)]/30 opacity-50 group-hover:rotate-45 transition-transform duration-1000" />
    </div>
  );
}

function MarketRow({ asset, name, price, change, sentiment, positive }: { asset: string, name: string, price: string, change: string, sentiment: string, positive?: boolean }) {
  return (
    <div className="grid grid-cols-5 items-center p-2 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
      <div className="col-span-1 flex flex-col">
        <span className="font-bold text-white text-sm">{asset}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{name}</span>
      </div>
      <div className="col-span-1 font-['Space_Mono'] text-sm text-white/90">
        {price}
      </div>
      <div className={`col-span-1 font-['Space_Mono'] text-sm font-bold ${positive ? 'text-[var(--green-profit)]' : 'text-[var(--red-loss)]'}`}>
        {change}
      </div>
      <div className="col-span-1 text-xs text-[var(--text-muted)] flex items-center gap-1">
        <div className={`w-1 h-3 rounded-full ${positive ? 'bg-[var(--green-profit)]' : 'bg-[var(--gold-500)]/50'}`} />
        {sentiment}
      </div>
      <div className="col-span-1 text-left">
        <button className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded border border-[var(--gold-500)]/30 text-[var(--gold-500)] hover:bg-[var(--gold-500)] hover:text-black transition-colors">
          נתח
        </button>
      </div>
    </div>
  );
}

function BotStatus({ name, status, type, active }: { name: string, status: string, type: string, active?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded border border-white/5 bg-[var(--obsidian-800)] relative overflow-hidden">
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--cyan-accent)] gauge-glow" />}
      
      <div>
        <div className="text-sm font-bold text-white">{name}</div>
        <div className="text-[10px] text-[var(--text-muted)]">{type}</div>
      </div>
      
      <div className={`text-[10px] font-bold font-['Space_Mono'] tracking-widest px-2 py-1 rounded border
        ${active ? 'text-[var(--cyan-accent)] border-[var(--cyan-accent)]/30 bg-[var(--cyan-accent)]/10' : 'text-[var(--text-muted)] border-white/10'}`}
      >
        {status}
      </div>
    </div>
  );
}

function SignalRow({ type, asset, action, price, confidence, why, bearish }: { type: string, asset: string, action: string, price: string, confidence: string, why: string, bearish?: boolean }) {
  return (
    <div className="p-3 rounded border border-white/5 bg-gradient-to-r from-transparent to-[var(--obsidian-800)]">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[var(--gold-500)] font-bold">{type}</span>
          <span className="text-white font-bold text-sm">{asset}</span>
        </div>
        <div className={`text-[10px] font-bold font-['Space_Mono'] px-2 py-0.5 rounded border
          ${bearish ? 'text-[var(--red-loss)] border-[var(--red-loss)]/30 bg-[var(--red-loss)]/10' : 'text-[var(--green-profit)] border-[var(--green-profit)]/30 bg-[var(--green-profit)]/10'}`}
        >
          {action}
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs font-['Space_Mono'] text-[var(--text-muted)] mb-2">
        <div>מחיר: {price}</div>
        <div>ביטחון: <span className="text-white">{confidence}</span></div>
      </div>
      
      <div className="flex items-start gap-1.5 text-[11px] text-[var(--text-muted)] bg-black/20 p-2 rounded border border-white/5">
        <Lightbulb size={12} className="text-[var(--cyan-accent)] shrink-0 mt-0.5" />
        <p><strong className="text-white/80">למה?</strong> {why}</p>
      </div>
    </div>
  );
}

function LessonItem({ title, duration }: { title: string, duration: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors group/item">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[var(--gold-500)]/10 flex items-center justify-center border border-[var(--gold-500)]/20 group-hover/item:border-[var(--gold-500)]/50 transition-colors">
          <BookOpen size={10} className="text-[var(--gold-500)]" />
        </div>
        <span className="text-sm text-white/90 group-hover/item:text-[var(--gold-500)] transition-colors">{title}</span>
      </div>
      <span className="text-[10px] text-[var(--text-muted)] font-['Space_Mono']">{duration}</span>
    </div>
  );
}
