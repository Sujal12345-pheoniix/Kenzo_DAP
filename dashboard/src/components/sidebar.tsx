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
      animate={{ width: isCollapsed ? 76 : 260 }}
      transition={{ type: 'spring', damping: 20, stiffness: 120 }}
      className="h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between relative z-30 select-none"
    >
      {/* Collapse Trigger Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 text-zinc-400 hover:text-indigo-400 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div>
        {/* Header / Logo */}
        <div className={`p-5 flex items-center gap-3 border-b border-zinc-900/80 ${isCollapsed ? 'justify-center' : ''}`}>
          <KenzoLogo size={32} />
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <h1 className="font-outfit font-bold text-base tracking-tight text-white leading-tight">Kenzo DAP</h1>
              <span className="text-[10px] font-semibold text-indigo-400 tracking-widest uppercase">Admin Portal</span>
            </motion.div>
          )}
        </div>

        {/* Workspace Selector */}
        {!isCollapsed ? (
          <div className="px-4 py-3 relative">
            <button 
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800/80 transition-all text-left text-zinc-300 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Building size={12} />
                </div>
                <div className="text-xs font-medium truncate max-w-[120px]">
                  Kenzo HQ Workspace
                </div>
              </div>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>

            {/* Workspace Dropdown Mock */}
            <AnimatePresence>
              {workspaceMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute left-4 right-4 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 shadow-xl z-50 text-xs text-zinc-400"
                >
                  <div className="px-2 py-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Switch Workspace</div>
                  <button onClick={() => setWorkspaceMenuOpen(false)} className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-800 hover:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Kenzo HQ Workspace (Active)
                  </button>
                  <button onClick={() => setWorkspaceMenuOpen(false)} className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-800 hover:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-600"></span> Development Sandbox
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-4 flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/10 shadow-sm shadow-indigo-500/10">
              <Building size={16} />
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="px-3 py-2 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center rounded-lg p-2.5 transition-all group cursor-pointer ${
                  isActive 
                    ? 'text-white font-medium bg-gradient-to-r from-indigo-500/10 to-indigo-500/0 border border-indigo-500/20' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
                }`}
              >
                {/* Active Indicator Glow */}
                {isActive && (
                  <motion.div 
                    layoutId="activeGlow"
                    className="absolute left-0 w-[3px] h-[60%] bg-indigo-500 rounded-r-md"
                  />
                )}
                
                <div className={`flex items-center ${isCollapsed ? 'mx-auto justify-center' : 'gap-3'}`}>
                  <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'} />
                  {!isCollapsed && (
                    <span className="text-sm font-sans tracking-wide">{item.label}</span>
                  )}
                </div>

                {/* Badge (like flow counts) */}
                {!isCollapsed && item.badge && (
                  <span className="ml-auto text-[10px] bg-zinc-800 border border-zinc-700/80 px-1.5 py-0.5 rounded-full text-zinc-300 font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Actions */}
      <div className="p-3 border-t border-zinc-900/80 flex flex-col gap-2">
        <a 
          href="/sandbox.html" 
          target="_blank" 
          rel="noreferrer" 
          className={`flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium shadow-lg shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full py-2.5 px-4 text-sm gap-2'
          }`}
          title="Open CRM Sandbox"
        >
          <ExternalLink size={16} />
          {!isCollapsed && <span>Open CRM Sandbox</span>}
        </a>

        <button 
          onClick={loadData} 
          className={`flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 active:scale-95 text-zinc-400 hover:text-zinc-200 transition-all focus:outline-none ${
            isCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full py-2.5 px-4 text-xs gap-2'
          }`}
          title="Sync Dashboard"
        >
          <RefreshCw size={14} />
          {!isCollapsed && <span>Sync Dashboard</span>}
        </button>

        {/* User profile */}
        <div className={`mt-2 pt-2 border-t border-zinc-900/40 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-semibold text-xs shrink-0 ring-1 ring-zinc-800 ring-offset-1 ring-offset-zinc-950">
              S
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-xs font-semibold text-zinc-200 truncate">Sujal K.</span>
                <span className="text-[10px] text-zinc-500 truncate">sujal@kenzo.io</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button className="text-zinc-500 hover:text-zinc-300 cursor-pointer p-1 rounded hover:bg-zinc-900 transition-all">
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
