import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Layers, 
  BookOpen, 
  ExternalLink, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Building,
  ChevronDown
} from 'lucide-react';
import KenzoLogo from './logo';

interface SidebarProps {
  activeTab: 'dashboard' | 'walkthroughs' | 'integration';
  setActiveTab: (tab: 'dashboard' | 'walkthroughs' | 'integration') => void;
  loadData: () => void;
  flowsCount: number;
}

interface NavItem {
  id: 'dashboard' | 'walkthroughs' | 'integration';
  label: string;
  icon: any;
  badge?: number;
}

export default function Sidebar({ activeTab, setActiveTab, loadData, flowsCount }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Analytics Dashboard', icon: BarChart3 },
    { id: 'walkthroughs', label: 'Walkthrough Tours', icon: Layers, badge: flowsCount > 0 ? flowsCount : undefined },
    { id: 'integration', label: 'Snippet Install', icon: BookOpen },
  ];

  return (
    <motion.div 
      animate={{ width: isCollapsed ? 80 : 270 }}
      transition={{ type: 'spring', damping: 22, stiffness: 130 }}
      className="h-[calc(100vh-32px)] my-4 ml-4 bg-zinc-900 border border-zinc-800/50 rounded-2xl flex flex-col justify-between relative z-30 shadow-2xl select-none shrink-0"
    >
      {/* Collapse Trigger Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 text-zinc-400 hover:text-indigo-400 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 focus:outline-none z-50 shadow-md"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div>
        {/* Header / Logo */}
        <div className={`p-5 flex items-center gap-3 border-b border-zinc-800/40 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="shrink-0 flex items-center justify-center">
            <KenzoLogo size={32} />
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <h1 className="font-outfit font-bold text-base tracking-tight text-white leading-tight">Kenzo DAP</h1>
              <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Admin Portal</span>
            </motion.div>
          )}
        </div>

        {/* Workspace Selector */}
        {!isCollapsed ? (
          <div className="px-4 py-4 relative">
            <button 
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-850 hover:border-zinc-800 transition-all text-left text-zinc-300 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Building size={12} />
                </div>
                <div className="text-xs font-semibold truncate max-w-[130px]">
                  Kenzo HQ Workspace
                </div>
              </div>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>

            {/* Workspace Dropdown */}
            <AnimatePresence>
              {workspaceMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute left-4 right-4 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1 shadow-2xl z-50 text-xs text-zinc-400"
                >
                  <div className="px-2.5 py-1.5 text-[9px] font-bold tracking-wider text-zinc-500 uppercase">Select Workspace</div>
                  <button onClick={() => setWorkspaceMenuOpen(false)} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-900 hover:text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Kenzo HQ Workspace (Active)
                  </button>
                  <button onClick={() => setWorkspaceMenuOpen(false)} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-900 hover:text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-650"></span> Development Sandbox
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-4 flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/10">
              <Building size={15} />
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="px-3 py-2 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center rounded-xl p-3 transition-all duration-300 group cursor-pointer ${
                  isActive 
                    ? 'text-white font-medium bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/30 border border-violet-500/20 translate-x-1' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent hover:translate-x-0.5'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'mx-auto justify-center' : 'gap-3.5'}`}>
                  <Icon size={18} className={isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'} />
                  {!isCollapsed && (
                    <span className="text-xs font-semibold tracking-wide font-outfit">{item.label}</span>
                  )}
                </div>

                {/* Badge */}
                {!isCollapsed && item.badge && (
                  <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Actions */}
      <div className="p-3 border-t border-zinc-850/40 flex flex-col gap-2.5">
        <a 
          href="/sandbox.html" 
          target="_blank" 
          rel="noreferrer" 
          className={`flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all ${
            isCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full py-3 px-4 text-xs gap-2'
          }`}
          title="Open CRM Sandbox"
        >
          <ExternalLink size={14} />
          {!isCollapsed && <span className="font-outfit">Open CRM Sandbox</span>}
        </a>

        <button 
          onClick={loadData} 
          className={`flex items-center justify-center rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 active:scale-95 text-zinc-400 hover:text-zinc-250 transition-all cursor-pointer ${
            isCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full py-2.5 px-4 text-[10px] gap-2 font-semibold'
          }`}
          title="Sync Dashboard"
        >
          <RefreshCw size={12} />
          {!isCollapsed && <span className="font-outfit">Sync Dashboard</span>}
        </button>

        {/* User profile */}
        <div className={`mt-2 pt-3 border-t border-zinc-850/40 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow shadow-indigo-500/20">
              S
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[11px] font-bold text-zinc-200 truncate">Sujal K.</span>
                <span className="text-[9px] text-zinc-500 truncate">sujal@kenzo.io</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button className="text-zinc-500 hover:text-zinc-300 cursor-pointer p-1 rounded-lg hover:bg-zinc-800/50 transition-all">
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
