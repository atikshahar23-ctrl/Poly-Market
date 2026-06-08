import React from 'react';
import { 
  LayoutDashboard, LineChart, Activity, Zap, Brain, Bot, Rocket, 
  MonitorPlay, History, PieChart, GraduationCap, BookOpen, Compass, 
  Wrench, Wallet, RefreshCw, AlertCircle, TrendingUp, TrendingDown, 
  Info, ChevronLeft, ShieldCheck, ChevronDown, CheckCircle2, PlayCircle,
  Lightbulb, Sparkles
} from 'lucide-react';
import './_group.css';

const navGroups = [
  {
    title: "",
    items: [
      { name: "לוח בקרה", icon: LayoutDashboard, active: true }
    ]
  },
  {
    title: "שווקים",
    items: [
      { name: "קריפטו", icon: LineChart },
      { name: "מניות", icon: Activity },
      { name: "מוברים", icon: Zap },
      { name: "שווקים חיים", icon: MonitorPlay },
      { name: "בינאנס", icon: LineChart }
    ]
  },
  {
    title: "סיגנלים ו-AI",
    items: [
      { name: "סקאלפ", icon: Zap },
      { name: "מומנטום", icon: Activity },
      { name: "Funding Arb", icon: RefreshCw },
      { name: "Quick Bets", icon: Rocket },
      { name: "Smart Money", icon: Brain },
      { name: "המלצות", icon: ShieldCheck },
      { name: "יועץ ראשי", icon: Bot }
    ]
  },
  {
    title: "אוטומציה",
    items: [
      { name: "מרכז הבוטים", icon: Bot },
      { name: "Scalp Squad", icon: Zap }
    ]
  },
  {
    title: "השולחן שלי",
    items: [
      { name: "סימולטור", icon: MonitorPlay },
      { name: "Trade Desk", icon: LayoutDashboard },
      { name: "היסטוריה", icon: History },
      { name: "אנליטיקה", icon: PieChart }
    ]
  },
  {
    title: "לימוד ומחקר",
    items: [
      { name: "אקדמיה", icon: GraduationCap },
      { name: "מחקר", icon: BookOpen },
      { name: "תדריך", icon: Compass },
      { name: "כלים", icon: Wrench }
    ]
  }
];

export function Atelier() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#16171a] text-[#e0e0e0] font-sans selection:bg-[#e6d5b3]/30">
      
      {/* Sidebar */}
      <aside className="fixed top-0 right-0 w-72 h-screen bg-[#1a1b1e] border-l border-[#e6d5b3]/10 overflow-y-auto hidden md:flex flex-col z-20">
        <div className="p-8 flex items-center gap-4 border-b border-[#e6d5b3]/10">
          <img src="/__mockup/images/brand-logo.png" alt="HEAVY GUARD" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(230,213,179,0.3)]" />
          <div>
            <h1 className="font-['Playfair_Display'] text-xl tracking-wider text-[#e6d5b3]">HEAVY GUARD</h1>
            <p className="text-[10px] text-[#8c8d8f] tracking-widest uppercase">Atelier Edition</p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-8">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {group.title && (
                <h3 className="px-4 text-xs font-['Playfair_Display'] text-[#8c8d8f] mb-3 tracking-widest">{group.title}</h3>
              )}
              <ul className="space-y-1">
                {group.items.map((item, i) => (
                  <li key={i}>
                    <button className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 text-sm ${
                      item.active 
                        ? "bg-[#e6d5b3]/10 text-[#e6d5b3] font-medium" 
                        : "text-[#a0a0a0] hover:bg-[#222327] hover:text-[#e0e0e0]"
                    }`}>
                      <item.icon className={`w-4 h-4 ${item.active ? "text-[#e6d5b3]" : "text-[#707070]"}`} strokeWidth={1.5} />
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-[#e6d5b3]/10">
          <div className="bg-[#222327] rounded-xl p-4 border border-[#e6d5b3]/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#e6d5b3]/5 blur-2xl rounded-full"></div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#e6d5b3]" />
              <span className="text-xs font-medium text-[#e6d5b3]">חשבון פייפר</span>
            </div>
            <p className="text-[11px] text-[#8c8d8f] leading-relaxed">
              סביבת דמו לימודית בלבד. הנתונים אינם מהווים ייעוץ פיננסי.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:pr-72 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="h-20 bg-[#16171a]/80 backdrop-blur-md border-b border-[#e6d5b3]/10 sticky top-0 z-10 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="font-['Playfair_Display'] text-2xl text-[#e6d5b3] font-normal tracking-wide">לוח בקרה</h2>
            <span className="bg-[#e6d5b3]/10 text-[#e6d5b3] border border-[#e6d5b3]/20 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
              דמו לימודי
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 text-sm bg-[#1a1b1e] border border-[#e6d5b3]/15 px-4 py-2 rounded-full">
              <span className="text-[#8c8d8f]">JARVIS</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#4dd0e1] shadow-[0_0_8px_rgba(77,208,225,0.6)] animate-pulse"></div>
              <span className="text-[#4dd0e1] text-xs px-2 border-r border-[#e6d5b3]/10 mr-2">Online</span>
            </div>

            <div className="flex items-center gap-3 text-sm bg-[#1a1b1e] border border-[#e6d5b3]/15 px-5 py-2 rounded-full">
              <Wallet className="w-4 h-4 text-[#e6d5b3]" />
              <span className="text-[#8c8d8f] text-xs">שווי תיק:</span>
              <span className="font-['Space_Mono'] text-[#e6d5b3]">$124,500.00</span>
            </div>

            <button className="p-2.5 rounded-full border border-[#e6d5b3]/15 hover:bg-[#e6d5b3]/10 transition-colors text-[#8c8d8f]">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard */}
        <div className="flex-1 p-8 space-y-10 max-w-7xl mx-auto w-full">
          
          {/* Welcome / Onboarding Strip */}
          <section className="bg-gradient-to-l from-[#1a1b1e] to-[#16171a] border border-[#e6d5b3]/20 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#e6d5b3]/5 blur-3xl rounded-full"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <h3 className="font-['Playfair_Display'] text-3xl text-[#e6d5b3] mb-3">ברוכים הבאים לאטלייה</h3>
                <p className="text-[#a0a0a0] text-sm leading-relaxed">
                  המרחב הלימודי של Heavy Guard. כאן תוכלו לתרגל אסטרטגיות, לנתח שווקים עם כלי בינה מלאכותית, וללמוד לסחור בביטחון בסביבת דמו נטולת סיכון.
                </p>
              </div>
              <button className="shrink-0 flex items-center gap-2 bg-[#e6d5b3] text-[#16171a] px-6 py-3 rounded-full text-sm font-medium hover:bg-[#f0e4cc] transition-colors">
                <PlayCircle className="w-4 h-4" />
                <span>התחל סיור מודרך</span>
              </button>
            </div>
          </section>

          {/* KPI Row */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "שווי תיק", value: "$124,500.00", change: "+2.4%", up: true },
              { label: "רווח/הפסד היום", value: "+$2,840.50", change: "+1.2%", up: true },
              { label: "פוזיציות פתוחות", value: "7", change: "2 חדשות", up: true },
              { label: "מזומן פנוי", value: "$45,200.00", change: "36% מהתיק", up: null }
            ].map((kpi, i) => (
              <div key={i} className="bg-[#1a1b1e] border border-[#e6d5b3]/10 rounded-2xl p-6 relative group hover:border-[#e6d5b3]/30 transition-colors duration-500">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e6d5b3]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-xs text-[#8c8d8f] mb-2">{kpi.label}</p>
                <div className="font-['Space_Mono'] text-2xl text-[#e0e0e0] mb-3">{kpi.value}</div>
                <div className="flex items-center gap-2 text-xs">
                  {kpi.up === true && <TrendingUp className="w-3 h-3 text-[#4caf50]" />}
                  {kpi.up === false && <TrendingDown className="w-3 h-3 text-[#f44336]" />}
                  <span className={kpi.up === true ? "text-[#4caf50]" : kpi.up === false ? "text-[#f44336]" : "text-[#8c8d8f]"}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            {/* Main Column */}
            <div className="xl:col-span-2 space-y-10">
              
              {/* סורק השוק */}
              <section>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h3 className="font-['Playfair_Display'] text-2xl text-[#e6d5b3] mb-1">סורק השוק</h3>
                    <p className="text-sm text-[#8c8d8f]">הצלבת נתוני בינאנס מול סנטימנט קהל ב-Polymarket</p>
                  </div>
                  <button className="text-[#e6d5b3] text-sm flex items-center gap-1 hover:underline">
                    לכל הנכסים <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="bg-[#1a1b1e] border border-[#e6d5b3]/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-[#222327] border-b border-[#e6d5b3]/10 text-[#8c8d8f] font-normal text-xs">
                      <tr>
                        <th className="px-6 py-4 font-normal">נכס</th>
                        <th className="px-6 py-4 font-normal">מחיר נוכחי</th>
                        <th className="px-6 py-4 font-normal">שינוי 24h</th>
                        <th className="px-6 py-4 font-normal">סנטימנט קהל</th>
                        <th className="px-6 py-4 font-normal">פער (Gap)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e6d5b3]/5 font-['Space_Mono'] text-sm">
                      {[
                        { coin: "BTC/USDT", price: "$64,230.00", change: "+4.2%", up: true, sentiment: "78% Bullish", gap: "High" },
                        { coin: "ETH/USDT", price: "$3,450.20", change: "+2.1%", up: true, sentiment: "65% Bullish", gap: "Medium" },
                        { coin: "SOL/USDT", price: "$142.80", change: "-1.5%", up: false, sentiment: "42% Bearish", gap: "Low" },
                        { coin: "AVAX/USDT", price: "$38.45", change: "+8.7%", up: true, sentiment: "82% Bullish", gap: "Extreme" },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-[#e6d5b3]/5 transition-colors">
                          <td className="px-6 py-4 font-sans font-medium text-[#e0e0e0]">{row.coin}</td>
                          <td className="px-6 py-4 text-[#e0e0e0]">{row.price}</td>
                          <td className={`px-6 py-4 ${row.up ? 'text-[#4caf50]' : 'text-[#f44336]'}`}>{row.change}</td>
                          <td className="px-6 py-4 text-[#8c8d8f]">{row.sentiment}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-sans tracking-wider ${
                              row.gap === 'Extreme' ? 'bg-[#4dd0e1]/20 text-[#4dd0e1] border border-[#4dd0e1]/30' :
                              row.gap === 'High' ? 'bg-[#e6d5b3]/20 text-[#e6d5b3] border border-[#e6d5b3]/30' :
                              'bg-[#222327] text-[#8c8d8f] border border-[#e6d5b3]/10'
                            }`}>
                              {row.gap}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* סיגנלים חיים */}
              <section>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h3 className="font-['Playfair_Display'] text-2xl text-[#e6d5b3] mb-1">סיגנלים חיים</h3>
                    <p className="text-sm text-[#8c8d8f]">הזדמנויות שאותרו על ידי בינה מלאכותית</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { title: "סקאלפ: פריצה ב-ETH", time: "לפני 2 דק'", type: "Long", why: "נפח מסחר חריג בשילוב עם תבנית Bull Flag בגרף 5 דקות." },
                    { title: "מומנטום: חולשה ב-SOL", time: "לפני 15 דק'", type: "Short", why: "סטייה דובית במתנד RSI יחד עם התנגדות ברמת פיבונאצ'י מרכזית." },
                    { title: "Funding Arb: BTC", time: "לפני 40 דק'", type: "Neutral", why: "פער ריביות מימון של 0.05% בין Binance ל-Bybit מאפשר רווח חסר סיכון כיווני." }
                  ].map((sig, i) => (
                    <div key={i} className="bg-[#1a1b1e] border border-[#e6d5b3]/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[#e6d5b3]/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          sig.type === 'Long' ? 'bg-[#4caf50]/10 text-[#4caf50]' :
                          sig.type === 'Short' ? 'bg-[#f44336]/10 text-[#f44336]' :
                          'bg-[#4dd0e1]/10 text-[#4dd0e1]'
                        }`}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-[#e0e0e0] font-medium mb-1">{sig.title}</h4>
                          <span className="text-xs text-[#8c8d8f] font-['Space_Mono']">{sig.time}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-[#222327] rounded-xl p-4 border border-[#e6d5b3]/5 relative group cursor-help">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="w-4 h-4 text-[#e6d5b3] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-['Playfair_Display'] text-[#e6d5b3] mb-1 block italic">למה זה קורה?</span>
                            <p className="text-sm text-[#a0a0a0] leading-relaxed">{sig.why}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* Side Column */}
            <div className="space-y-10">
              
              {/* הבוטים שלי */}
              <section>
                <h3 className="font-['Playfair_Display'] text-2xl text-[#e6d5b3] mb-6">הבוטים שלי</h3>
                <div className="bg-[#1a1b1e] border border-[#e6d5b3]/10 rounded-2xl p-6 space-y-6">
                  {[
                    { name: "Dip Buyer (BTC)", status: "Active", pnl: "+$450", active: true },
                    { name: "Breakout Hunter", status: "Armed", pnl: "$0", active: true },
                    { name: "Scalp Squad", status: "Paused", pnl: "-$12", active: false }
                  ].map((bot, i) => (
                    <div key={i} className="flex items-center justify-between pb-6 border-b border-[#e6d5b3]/10 last:border-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Bot className={`w-8 h-8 ${bot.active ? 'text-[#e6d5b3]' : 'text-[#505050]'}`} />
                          {bot.active && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#4caf50] border-2 border-[#1a1b1e] rounded-full"></div>}
                        </div>
                        <div>
                          <p className={`text-sm ${bot.active ? 'text-[#e0e0e0]' : 'text-[#8c8d8f]'}`}>{bot.name}</p>
                          <p className="text-xs font-['Space_Mono'] text-[#8c8d8f]">{bot.status}</p>
                        </div>
                      </div>
                      <div className={`font-['Space_Mono'] text-sm ${
                        bot.pnl.startsWith('+') ? 'text-[#4caf50]' : 
                        bot.pnl.startsWith('-') ? 'text-[#f44336]' : 'text-[#8c8d8f]'
                      }`}>
                        {bot.pnl}
                      </div>
                    </div>
                  ))}
                  
                  <button className="w-full py-3 mt-2 rounded-xl border border-[#e6d5b3]/20 text-[#e6d5b3] text-sm hover:bg-[#e6d5b3]/10 transition-colors">
                    + הוסף בוט חדש
                  </button>
                </div>
              </section>

              {/* אקדמיה / למד */}
              <section>
                <h3 className="font-['Playfair_Display'] text-2xl text-[#e6d5b3] mb-6">אקדמיה / למד</h3>
                <div className="bg-[#e6d5b3] text-[#16171a] rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_8px_30px_rgba(230,213,179,0.15)] transition-shadow duration-500">
                  <div className="absolute -right-10 -top-10 text-[#16171a]/5 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110">
                    <GraduationCap className="w-48 h-48" />
                  </div>
                  
                  <div className="relative z-10">
                    <h4 className="font-['Playfair_Display'] text-xl mb-4">שיעורים מומלצים עבורך</h4>
                    <ul className="space-y-4 mb-6">
                      <li className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#16171a]/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16171a]" />
                        </div>
                        <span className="text-sm font-medium">איך לקרוא את סורק השוק?</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#16171a]/10 flex items-center justify-center shrink-0">
                          <PlayCircle className="w-3.5 h-3.5 text-[#16171a]" />
                        </div>
                        <span className="text-sm font-medium">מה זה Funding Arb? (2 דק')</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#16171a]/10 flex items-center justify-center shrink-0">
                          <PlayCircle className="w-3.5 h-3.5 text-[#16171a]" />
                        </div>
                        <span className="text-sm font-medium">מה ה-AI בעצם עושה מאחורי הקלעים?</span>
                      </li>
                    </ul>
                    <button className="flex items-center gap-2 text-sm font-bold border-b-2 border-[#16171a] pb-0.5 hover:opacity-70 transition-opacity">
                      היכנס לאקדמיה <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
