import { Search, Bell, Sparkles, Command } from 'lucide-react';
import type { TabType } from './sidebar';

interface TopNavProps {
  activeTab: TabType;
  onSearchClick: () => void;
  flowsCount: number;
}

export default function TopNav({ activeTab, onSearchClick, flowsCount }: TopNavProps) {
  const formatTabLabel = (tab: string) => {
    return tab.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-8 flex items-center justify-between select-none relative z-20 shadow-2xs">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <span className="hover:text-slate-900 cursor-pointer transition-colors font-bold text-slate-800">Kenzo_DAP</span>
        <span className="text-slate-400">/</span>
        <span className="text-indigo-600 font-bold">{formatTabLabel(activeTab)}</span>
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center gap-5">
        {/* Ctrl+K Search Bar Trigger */}
        <button 
          onClick={onSearchClick}
          className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all text-xs cursor-pointer focus:outline-none w-56 justify-between shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <span>Search console...</span>
          </div>
          <div className="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-semibold text-slate-600 shrink-0">
            <Command size={10} />
            <span>K</span>
          </div>
        </button>

        {/* Real-time Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] text-indigo-700 font-bold tracking-wide shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
          <span>Live Engine ({flowsCount} Tours)</span>
        </div>

        {/* Notification Icon */}
        <button className="relative p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
        </button>

        {/* Quick Help / AI Spotlight */}
        <button className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer">
          <Sparkles size={13} />
          <span>AI Studio</span>
        </button>
      </div>
    </header>
  );
}
