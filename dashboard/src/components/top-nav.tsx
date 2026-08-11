import { Search, Bell, Sparkles, Command } from 'lucide-react';

interface TopNavProps {
  activeTab: 'dashboard' | 'insights' | 'walkthroughs' | 'integration';
  onSearchClick: () => void;
  flowsCount: number;
}

export default function TopNav({ activeTab, onSearchClick, flowsCount }: TopNavProps) {
  const getTabLabel = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Analytics Dashboard';
      case 'insights':
        return 'Insights Builder';
      case 'walkthroughs':
        return 'Walkthrough Tours';
      case 'integration':
        return 'Snippet Install';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-md px-8 flex items-center justify-between select-none relative z-20">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        <span className="hover:text-white cursor-pointer transition-colors">Kenzo DAP</span>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-200">{getTabLabel()}</span>
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center gap-5">
        {/* Ctrl+K Search Bar Trigger */}
        <button 
          onClick={onSearchClick}
          className="flex items-center gap-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all text-xs cursor-pointer focus:outline-none w-56 justify-between shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-zinc-500" />
            <span>Search console...</span>
          </div>
          <div className="flex items-center gap-0.5 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] font-semibold text-zinc-400 shrink-0">
            <Command size={10} />
            <span>K</span>
          </div>
        </button>

        {/* Real-time Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300 font-semibold tracking-wide shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
          <span>Live Tracking ({flowsCount} Tours)</span>
        </div>

        {/* Notification Icon */}
        <button className="relative p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800/80 transition-all cursor-pointer">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-1 ring-zinc-950"></span>
        </button>

        {/* Quick Help / AI Spotlight */}
        <button className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-md shadow-indigo-600/15 cursor-pointer">
          <Sparkles size={12} />
          <span>Ask AI Assistant</span>
        </button>
      </div>
    </header>
  );
}
