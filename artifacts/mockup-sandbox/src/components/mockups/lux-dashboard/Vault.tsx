import React from "react";
import "./_group.css";
import {
  LayoutDashboard,
  LineChart,
  Activity,
  Zap,
  Target,
  Brain,
  Lightbulb,
  Cpu,
  Bot,
  Terminal,
  History,
  PieChart,
  GraduationCap,
  BookOpen,
  FileText,
  Wrench,
  ShieldAlert,
  Wallet,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ChevronDown
} from "lucide-react";

export function Vault() {
  return (
    <div dir="rtl" className="min-h-screen bg-vault-obsidian text-vault-text font-sans selection:bg-vault-gold selection:text-black flex">
      {/* Sidebar */}
      <aside className="w-64 border-l border-vault-gold-dim bg-vault-obsidian flex flex-col h-screen sticky top-0 shrink-0">
        <div className="p-6 border-b border-vault-gold-dim">
          <div className="flex items-center gap-3">
            <img src="/__mockup/images/brand-logo.png" alt="Heavy Guard" className="w-8 h-8 rounded-full border border-vault-gold" />
            <span className="font-['Playfair_Display'] text-vault-gold-light tracking-wider font-bold text-lg">HEAVY GUARD</span>
          </div>
          <div className="mt-2 flex items-center justify-between border border-vault-gold-dim rounded px-2 py-1 bg-vault-surface text-xs text-vault-text-muted">
            <div className="flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-vault-cyan" />
              <span>דמו לימודי פעיל</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-vault-cyan animate-pulse"></span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
          <div className="space-y-1">
            <NavItem icon={<LayoutDashboard size={16} />} label="לוח בקרה" active />
          </div>
          
          <div className="space-y-1">
            <NavHeader label="שווקים" />
            <NavItem icon={<Activity size={16} />} label="קריפטו" />
            <NavItem icon={<LineChart size={16} />} label="מניות" />
            <NavItem icon={<Zap size={16} />} label="מוברים" />
            <NavItem icon={<Target size={16} />} label="שווקים חיים" />
          </div>

          <div className="space-y-1">
            <NavHeader label="סיגנלים ו-AI" />
            <NavItem icon={<Brain size={16} />} label="יועץ ראשי" />
            <NavItem icon={<Zap size={16} />} label="סקאלפ" />
            <NavItem icon={<TrendingUp size={16} />} label="מומנטום" />
            <NavItem icon={<Lightbulb size={16} />} label="המלצות" />
          </div>

          <div className="space-y-1">
            <NavHeader label="אוטומציה" />
            <NavItem icon={<Cpu size={16} />} label="מרכז הבוטים" />
            <NavItem icon={<Bot size={16} />} label="Scalp Squad" />
          </div>

          <div className="space-y-1">
            <NavHeader label="השולחן שלי" />
            <NavItem icon={<Terminal size={16} />} label="סימולטור" />
            <NavItem icon={<Wallet size={16} />} label="Trade Desk" />
            <NavItem icon={<History size={16} />} label="היסטוריה" />
            <NavItem icon={<PieChart size={16} />} label="אנליטיקה" />
          </div>

          <div className="space-y-1">
            <NavHeader label="לימוד ומחקר" />
            <NavItem icon={<GraduationCap size={16} />} label="אקדמיה" />
            <NavItem icon={<BookOpen size={16} />} label="מחקר" />
            <NavItem icon={<FileText size={16} />} label="תדריך" />
            <NavItem icon={<Wrench size={16} />} label="כלים" />
          </div>
        </div>
        
        <div className="p-4 border-t border-vault-gold-dim">
          <div className="text-center text-[10px] text-vault-text-muted opacity-50">
            אזהרה: המערכת מיועדת ללמידה וסימולציה בלבד. אין לראות במידע המלצה פיננסית.
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-vault-gold-dim flex items-center justify-between px-8 bg-vault-obsidian shrink-0">
          <h1 className="font-['Playfair_Display'] text-2xl text-vault-gold-light">הכספת</h1>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-vault-cyan/20 bg-vault-cyan/5 rounded text-vault-cyan text-sm">
              <Brain size={14} />
              <span>JARVIS</span>
            </div>
            
            <div className="flex items-center gap-2 text-vault-text-muted text-sm border border-vault-gold-dim px-3 py-1.5 rounded cursor-pointer bg-vault-surface-hover hover:border-vault-gold transition-colors">
              <RefreshCw size={14} />
              <span>עדכון: כל 5 שניות</span>
              <ChevronDown size={14} />
            </div>

            <div className="flex items-center gap-4 bg-vault-surface border border-vault-gold-dim px-4 py-1.5 rounded">
              <div className="flex flex-col">
                <span className="text-[10px] text-vault-text-muted uppercase">תיק נוכחי (USD)</span>
                <span className="font-['Space_Mono'] font-bold text-vault-gold-light">$124,500.00</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 overflow-y-auto space-y-8">
          
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-6">
            <KpiCard label="שווי תיק" value="$124,500.00" change="+2.4%" positive />
            <KpiCard label="רווח/הפסד היום" value="+$2,940.50" change="+1.8%" positive />
            <KpiCard label="פוזיציות פתוחות" value="12" />
            <KpiCard label="מזומן פנוי" value="$45,200.00" />
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Market Scanner */}
            <div className="col-span-2 space-y-4">
              <h2 className="font-['Playfair_Display'] text-xl text-vault-gold-light flex items-center gap-2 border-b border-vault-gold-dim pb-2">
                <Target className="text-vault-gold" size={20} /> סורק השוק המרכזי
              </h2>
              <div className="bg-vault-surface border border-vault-gold-dim rounded p-1 vault-corner">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-vault-text-muted border-b border-vault-gold-dim/50">
                      <th className="text-right py-3 px-4 font-normal">נכס</th>
                      <th className="text-right py-3 px-4 font-normal">מחיר (Binance)</th>
                      <th className="text-right py-3 px-4 font-normal">24h שינוי</th>
                      <th className="text-right py-3 px-4 font-normal">סנטימנט קהל (Polymarket)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ScannerRow asset="BTC/USDT" price="$64,230.00" change="+1.2%" sentiment="שוררי חזק" positive />
                    <ScannerRow asset="ETH/USDT" price="$3,450.20" change="-0.5%" sentiment="ניטרלי" />
                    <ScannerRow asset="SOL/USDT" price="$145.80" change="+5.4%" sentiment="שוררי" positive />
                    <ScannerRow asset="DOGE/USDT" price="$0.12" change="-2.1%" sentiment="דובי" negative />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Signals */}
            <div className="space-y-4">
              <h2 className="font-['Playfair_Display'] text-xl text-vault-gold-light flex items-center gap-2 border-b border-vault-gold-dim pb-2">
                <Zap className="text-vault-gold" size={20} /> סיגנלים חיים
              </h2>
              <div className="space-y-3">
                <SignalRow title="BTC Momentum" type="לונג" why="זינוק בנפח המסחר ב-15 דקות האחרונות" positive />
                <SignalRow title="ETH Funding Arb" type="ניטרלי" why="פער ריביות חריג מול Bybit" />
                <SignalRow title="SOL Scalp" type="שורט" why="התנגדות חזקה ב-150$ וסנטימנט יורד" negative />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Bots */}
            <div className="space-y-4">
              <h2 className="font-['Playfair_Display'] text-xl text-vault-gold-light flex items-center gap-2 border-b border-vault-gold-dim pb-2">
                <Cpu className="text-vault-gold" size={20} /> הבוטים שלי
              </h2>
              <div className="grid gap-4">
                <BotCard name="Dip Buyer" status="חמוש" active />
                <BotCard name="Breakout Hunter" status="מנוטרל" />
                <BotCard name="Scalp Squad" status="חמוש" active />
              </div>
            </div>

            {/* Academy */}
            <div className="space-y-4">
              <h2 className="font-['Playfair_Display'] text-xl text-vault-gold-light flex items-center gap-2 border-b border-vault-gold-dim pb-2">
                <GraduationCap className="text-vault-gold" size={20} /> אקדמיה / למד
              </h2>
              <div className="bg-vault-surface border border-vault-gold-dim rounded p-6 vault-corner h-[calc(100%-3rem)] flex flex-col">
                <p className="text-vault-text-muted text-sm mb-6">העמק את הידע שלך והבן איך המערכת מנתחת נתונים בזמן אמת.</p>
                <div className="space-y-4 flex-1">
                  <AcademyLesson title="איך לקרוא את סורק השוק?" time="3 דק'" />
                  <AcademyLesson title="מה זה Funding Arb?" time="5 דק'" />
                  <AcademyLesson title="איך ה-AI בוחר סיגנלים?" time="4 דק'" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function NavHeader({ label }: { label: string }) {
  return <div className="text-xs text-vault-gold-dim font-bold mt-4 mb-2 px-2 uppercase tracking-wider">{label}</div>;
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${active ? 'bg-vault-gold/10 text-vault-gold border-r-2 border-vault-gold' : 'text-vault-text hover:bg-vault-surface-hover hover:text-vault-gold-light border-r-2 border-transparent'}`}>
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function KpiCard({ label, value, change, positive }: { label: string; value: string; change?: string; positive?: boolean }) {
  return (
    <div className="bg-vault-surface border border-vault-gold-dim p-5 rounded vault-corner flex flex-col justify-center">
      <div className="text-vault-text-muted text-sm mb-1">{label}</div>
      <div className="flex items-end gap-3">
        <div className="font-['Space_Mono'] text-2xl text-vault-text">{value}</div>
        {change && (
          <div className={`text-sm mb-1 font-['Space_Mono'] ${positive ? 'text-vault-green' : 'text-vault-red'}`}>
            {change}
          </div>
        )}
      </div>
    </div>
  );
}

function ScannerRow({ asset, price, change, sentiment, positive, negative }: any) {
  return (
    <tr className="border-b border-vault-gold-dim/20 hover:bg-vault-surface-hover transition-colors group">
      <td className="py-3 px-4 font-bold text-vault-gold-light">{asset}</td>
      <td className="py-3 px-4 font-['Space_Mono']">{price}</td>
      <td className={`py-3 px-4 font-['Space_Mono'] ${positive ? 'text-vault-green' : negative ? 'text-vault-red' : ''}`}>{change}</td>
      <td className="py-3 px-4 text-vault-text-muted text-sm flex items-center gap-2">
        {sentiment}
        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-vault-gold transition-opacity" />
      </td>
    </tr>
  );
}

function SignalRow({ title, type, why, positive, negative }: any) {
  return (
    <div className="bg-vault-surface border border-vault-gold-dim rounded p-3 vault-corner flex flex-col gap-2 hover:border-vault-gold transition-colors cursor-pointer group">
      <div className="flex justify-between items-center">
        <span className="font-bold text-vault-gold-light">{title}</span>
        <span className={`text-xs px-2 py-0.5 rounded border ${positive ? 'bg-vault-green/10 text-vault-green border-vault-green/30' : negative ? 'bg-vault-red/10 text-vault-red border-vault-red/30' : 'bg-vault-surface-hover text-vault-text-muted border-vault-gold-dim'}`}>{type}</span>
      </div>
      <div className="text-xs text-vault-text-muted flex gap-1">
        <span className="text-vault-gold">למה?</span> {why}
      </div>
    </div>
  );
}

function BotCard({ name, status, active }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-vault-surface border border-vault-gold-dim rounded vault-corner hover:bg-vault-surface-hover transition-colors">
      <div className="flex items-center gap-3">
        <Bot className={`w-5 h-5 ${active ? 'text-vault-cyan' : 'text-vault-text-muted'}`} />
        <span className="font-bold">{name}</span>
      </div>
      <div className={`text-sm flex items-center gap-2 ${active ? 'text-vault-gold' : 'text-vault-text-muted'}`}>
        <span className={`w-2 h-2 rounded-full ${active ? 'bg-vault-cyan animate-pulse' : 'bg-vault-gold-dim'}`}></span>
        {status}
      </div>
    </div>
  );
}

function AcademyLesson({ title, time }: any) {
  return (
    <div className="flex items-center justify-between p-3 border border-vault-gold-dim/50 rounded bg-vault-obsidian hover:border-vault-gold cursor-pointer transition-colors group">
      <span className="text-sm group-hover:text-vault-gold-light transition-colors">{title}</span>
      <span className="text-xs text-vault-text-muted font-['Space_Mono']">{time}</span>
    </div>
  );
}
