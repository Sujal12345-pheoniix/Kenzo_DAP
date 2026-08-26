import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Layout, Code, BarChart2, Play, RefreshCw, Sparkles, X } from 'lucide-react';
import type { TabType } from './sidebar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: TabType) => void;
  loadData: () => void;
  flows: Array<{ id: string; name: string }>;
}

export default function CommandPalette({ isOpen, onClose, setActiveTab, loadData, flows }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Define static commands
  const commands = [
    { 
      id: 'go-dashboard', 
      title: 'Go to Analytics Dashboard', 
      category: 'Navigation', 
      icon: BarChart2, 
      action: () => setActiveTab('analytics_overview'),
      shortcut: '↵'
    },
    { 
      id: 'go-tours', 
      title: 'Go to Walkthrough Tours', 
      category: 'Navigation', 
      icon: Layout, 
      action: () => setActiveTab('guidance_flows'),
      shortcut: '↵'
    },
    { 
      id: 'go-integration', 
      title: 'Go to Snippet Installation', 
      category: 'Navigation', 
      icon: Code, 
      action: () => setActiveTab('integrations'),
      shortcut: '↵'
    },
    { 
      id: 'sync', 
      title: 'Sync Dashboard Data', 
      category: 'System', 
      icon: RefreshCw, 
      action: () => loadData(),
      shortcut: 'R'
    },
    { 
      id: 'sandbox', 
      title: 'Launch CRM Sandbox (Builder)', 
      category: 'External', 
      icon: Play, 
      action: () => window.open('/sandbox.html?kenzo_builder=true', '_blank'),
      shortcut: 'B'
    },
  ];

  // Dynamic commands from flows
  const flowCommands = flows.map(flow => ({
    id: `flow-${flow.id}`,
    title: `Preview Tour: ${flow.name}`,
    category: 'Walkthroughs',
    icon: Play,
    action: () => window.open(`/sandbox.html?kenzo_flow=${flow.id}`, '_blank'),
    shortcut: '↵'
  }));

  const allItems = [...commands, ...flowCommands];
  const filteredItems = allItems.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  // Bind key events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette on Ctrl+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setSearch('');
    }
  }, [isOpen]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 cursor-default select-none"
        >
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="w-full max-w-xl bg-[#0b1324] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Input Bar */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800 bg-[#070d18]/60">
              <Search size={18} className="text-sky-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search tours, workflows..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                className="w-full bg-transparent text-white border-none outline-none placeholder-slate-500 text-xs py-0.5"
              />
              <button 
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-[340px] overflow-y-auto p-2.5 flex flex-col gap-1">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <Sparkles size={24} className="text-sky-400/60 animate-pulse" />
                  <p className="text-xs text-white font-medium">No commands found</p>
                  <p className="text-[11px] text-slate-500">Try searching for "navigation" or "sync"</p>
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-sky-500/15 border border-sky-500/40 text-white font-medium shadow-sm' 
                          : 'border border-transparent hover:bg-slate-800/40 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isSelected ? 'bg-sky-500/20 text-sky-300' : 'bg-[#070d18] text-slate-400'}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-syne tracking-wide truncate">{item.title}</span>
                          <span className="text-[10px] text-slate-500 truncate">{item.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-[#070d18] text-slate-400 px-2 py-0.5 rounded-lg border border-slate-800 font-mono font-bold">
                          {item.shortcut}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-slate-800 bg-[#070d18]/80 text-[10px] text-slate-400 flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <span>↑↓ Navigate</span>
                <span>•</span>
                <span>↵ Select</span>
                <span>•</span>
                <span>ESC Close</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] tracking-wide text-sky-400 uppercase font-mono">
                <Command size={10} />
                <span>Kenzo Command Palette</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
