import { Search, Bell, Sparkles, Command } from 'lucide-react';
import type { TabType } from './sidebar';

interface TopNavProps {
  activeTab: TabType;
  onSearchClick: () => void;
  flowsCount: number;
}

export default function TopNav({ activeTab, onSearchClick, flowsCount }: TopNavProps) {
  const formatTabLabel = (tab: string) => {
    return tab.replace(/^(guidance_|ceo_)/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#070d18]/85 backdrop-blur-xl px-6 md:px-8 flex items-center justify-between select-none relative z-20 shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className="text-slate-400 hover:text-white cursor-pointer transition-colors font-syne font-bold">Kenzo_DAP</span>
        <span className="text-slate-600">/</span>
        <span className="hero-gradient-text font-bold tracking-tight">{formatTabLabel(activeTab)}</span>
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Ctrl+K Search Bar Trigger */}
        <button 
          onClick={onSearchClick}
          className="flex items-center gap-3 bg-[#0b1324] hover:bg-[#101c33] border border-slate-700/60 hover:border-sky-500/40 px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all text-xs cursor-pointer focus:outline-none w-48 sm:w-60 justify-between shadow-inner"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-sky-400" />
            <span className="truncate">Quick search & commands...</span>
          </div>
          <div className="flex items-center gap-0.5 bg-[#05090f] px-1.5 py-0.5 rounded border border-slate-700 text-[10px] font-mono text-slate-400 shrink-0">
            <Command size={10} />
            <span>K</span>
          </div>
        </button>

        {/* Real-time Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-[11px] text-sky-400 font-semibold tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <span>Live Engine ({flowsCount} Active)</span>
        </div>

        {/* Notification Icon */}
        <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl border border-transparent hover:border-slate-700/60 transition-all cursor-pointer">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-[#070d18]" />
        </button>

        {/* AI Studio action button */}
        <button className="kenzo-glow-btn text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
          <Sparkles size={13} className="text-sky-200" />
          <span className="hidden sm:inline">AI Studio</span>
        </button>
      </div>
    </header>
  );
}
