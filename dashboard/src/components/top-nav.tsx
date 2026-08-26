import { Search, Bell, Command, Sun, Moon } from 'lucide-react';
import type { TabType } from './sidebar';

interface TopNavProps {
  activeTab: TabType;
  onSearchClick: () => void;
  flowsCount: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function TopNav({ activeTab, onSearchClick, flowsCount, theme = 'dark', onToggleTheme }: TopNavProps) {
  const formatTabLabel = (tab: string) => {
    return tab.replace(/^(guidance_|ceo_)/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <header className="h-14 border-b border-[#1E293B] bg-[#070D18] px-6 flex items-center justify-between select-none relative z-20 shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className="text-slate-400 hover:text-white transition-colors">Kenzo_DAP</span>
        <span className="text-slate-600">/</span>
        <span className="text-white font-bold tracking-tight">{formatTabLabel(activeTab)}</span>
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Ctrl+K Search Bar Trigger */}
        <button 
          onClick={onSearchClick}
          className="flex items-center gap-3 bg-[#080E1A] hover:bg-[#0c1322] border border-[#1E293B] hover:border-slate-700 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors text-xs cursor-pointer focus:outline-none justify-between"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-slate-400" />
            <span className="truncate">Search commands...</span>
          </div>
          <div className="flex items-center gap-0.5 bg-[#05090f] px-1.5 py-0.5 rounded border border-slate-800 text-[10px] font-mono text-slate-400 shrink-0">
            <Command size={10} />
            <span>K</span>
          </div>
        </button>

        {/* Real-time Indicator */}
        <span className="text-xs text-slate-400 font-medium">{flowsCount} flows active</span>

        {/* Theme Switcher Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun size={15} className="text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon size={15} className="text-sky-500 hover:-rotate-12 transition-transform" />
            )}
          </button>
        )}

        {/* Notification Icon */}
        <button className="relative p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
          <Bell size={15} />
        </button>
      </div>
    </header>
  );
}
