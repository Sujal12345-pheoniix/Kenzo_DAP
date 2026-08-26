import { useState } from 'react';
import { 
  Search, 
  Star, 
  Plus, 
  HelpCircle, 
  Settings, 
  Bell, 
  Edit3, 
  ChevronDown, 
  X, 
  Minus, 
  MoveRight, 
  MoveLeft,
  Compass, 
  Link2, 
  Video, 
  FileText, 
  Radio, 
  MessageSquare, 
  Layers, 
  ShieldAlert, 
  ClipboardList, 
  Sparkles,
  CheckCircle,
  Play,
  ArrowRight,
  Target,
  Calendar,
  Users
} from 'lucide-react';

interface DAPStudioSimulatorProps {
  apiKey?: string;
  projectId?: string;
}

export default function DAPStudioSimulator({ apiKey: _apiKey }: DAPStudioSimulatorProps) {
  // Studio Drawer State
  const [studioPosition, setStudioPosition] = useState<'left' | 'right'>('left');
  const [isStudioMinimized, setIsStudioMinimized] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  // Live Tour Simulator State
  const [activeTourStep, setActiveTourStep] = useState<number | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<boolean>(false);

  const startDemoTour = () => {
    setActiveTourStep(1);
    setActiveTip(null);
    setActiveModal(false);
  };

  return (
    <div className="space-y-4 select-none text-left w-full relative min-h-[820px]">
      
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Live DAP In-App Studio & Sandbox</h2>
            <span className="text-xs bg-sky-500/10 text-sky-400 font-semibold px-2 py-0.5 rounded border border-sky-500/20 flex items-center gap-1">
              <Sparkles size={11} /> Interactive Studio
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Experience real in-context guidance creation, hotspots, and walkthroughs on client SaaS interfaces</p>
        </div>

        <div className="flex items-center gap-2">
          {!isStudioOpen && (
            <button
              onClick={() => { setIsStudioOpen(true); setIsStudioMinimized(false); }}
              className="kenzo-btn-primary text-xs"
            >
              <Sparkles size={13} />
              <span>Open DAP Studio</span>
            </button>
          )}
          <button
            onClick={startDemoTour}
            className="kenzo-btn-secondary text-xs"
          >
            <Play size={13} className="text-emerald-400" />
            <span>Simulate Walkthrough Tour</span>
          </button>
        </div>
      </div>

      {/* Target Application Viewport Container */}
      <div className="w-full bg-[#f8fafc] text-slate-900 rounded-xl border border-slate-700/80 shadow-2xl overflow-hidden relative min-h-[750px] flex flex-col font-sans transition-colors">
        
        {/* App Top Navigation Bar (CRM / ERP Standard Header) */}
        <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs z-10 shadow-sm shrink-0">
          {/* Left Brand & Search */}
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="flex items-center gap-2 font-bold text-slate-800 tracking-tight text-sm">
              <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                ⚡
              </div>
              <span>Kenzo_CRM</span>
            </div>

            {/* Global Search Bar */}
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="text-slate-400 absolute left-3 top-2" />
              <input
                type="text"
                placeholder="Search accounts, contacts, opportunities..."
                className="w-full bg-slate-50 border border-slate-300 rounded-full pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* CRM Navigation Dropdown Links */}
          <nav className="hidden xl:flex items-center gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1 hover:text-slate-900 cursor-pointer">
              <span>Contacts</span>
              <ChevronDown size={11} className="text-slate-400" />
            </div>
            <div className="flex items-center gap-1 hover:text-slate-900 cursor-pointer">
              <span>Opportunities</span>
              <ChevronDown size={11} className="text-slate-400" />
            </div>
            <div className="flex items-center gap-1 hover:text-slate-900 cursor-pointer">
              <span>Calendar</span>
              <ChevronDown size={11} className="text-slate-400" />
            </div>
            <span className="hover:text-slate-900 cursor-pointer">Forecasts</span>
            <div className="flex items-center gap-1 text-sky-600 font-bold cursor-pointer">
              <span>Dashboards</span>
              <ChevronDown size={11} className="text-sky-600" />
            </div>
            <div className="flex items-center gap-1 hover:text-slate-900 cursor-pointer">
              <span>Reports</span>
              <ChevronDown size={11} className="text-slate-400" />
            </div>
            <div className="flex items-center gap-1 hover:text-slate-900 cursor-pointer">
              <span>Quotes</span>
              <ChevronDown size={11} className="text-slate-400" />
            </div>
          </nav>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2 text-slate-500">
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer" title="Favorites">
              <Star size={14} />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer" title="Quick Create">
              <Plus size={14} />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer" title="Help">
              <HelpCircle size={14} />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer" title="Settings">
              <Settings size={14} />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer" title="Notifications">
              <Bell size={14} />
            </button>
            <div className="w-6 h-6 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center text-[10px] ml-1">
              J
            </div>
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer" title="Edit Dashboard Layout">
              <Edit3 size={13} />
            </button>
          </div>
        </header>

        {/* CRM Dashboard Canvas Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-slate-100/70">
          
          <div className="text-xs font-semibold text-slate-500">
            Welcome back, John! Let's get selling!
          </div>

          {/* 4 Core CRM Action Cards Grid (Exact match to uploaded design) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Card 1: Plan My Accounts */}
            <div 
              id="card-accounts"
              className={`bg-white p-5 rounded-xl border ${activeTourStep === 1 ? 'ring-4 ring-sky-500 border-sky-500 shadow-xl' : 'border-slate-200 shadow-sm'} relative transition-all`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Plan My Accounts</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Accounts owned by me</p>
                </div>
                {/* Embedded DAP Beacon on Card */}
                <button 
                  onClick={() => setActiveTip(activeTip === 'tip-accounts' ? null : 'tip-accounts')}
                  className="relative w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform"
                  title="Kenzo Smart Tip"
                >
                  <span className="absolute inset-0 rounded-full bg-sky-400 animate-ping opacity-75" />
                  <span className="text-[10px] font-bold relative z-10">?</span>
                </button>
              </div>

              {/* Active Smart Tip Popup */}
              {activeTip === 'tip-accounts' && (
                <div className="absolute right-4 top-12 z-30 bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs max-w-xs border border-slate-700 animate-in fade-in zoom-in-95">
                  <div className="font-bold text-sky-400 mb-1 flex items-center gap-1.5">
                    <Sparkles size={12} /> Account Portfolio Insights
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Accounts are prioritized by upcoming close probability and customer success engagement frequency.
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-800 flex justify-end">
                    <button 
                      onClick={() => setActiveTip(null)}
                      className="text-[10px] text-sky-300 font-semibold hover:underline"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}

              {/* Donut Chart & Legend Section */}
              <div className="flex items-center justify-center gap-8 py-5">
                {/* SVG Donut Chart with '3 Accounts' */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="3.2"
                      strokeDasharray="66, 100"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.2"
                      strokeDasharray="33, 100"
                      strokeDashoffset="-66"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-bold text-slate-800 leading-none">3</span>
                    <span className="text-[10px] text-slate-500 font-medium">Accounts</span>
                  </div>
                </div>

                {/* Activity Status Indicators */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>2 Upcoming Activity</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-700 bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-md text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span>1 Past Activity</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-md text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>0 No Activity</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="flex justify-center pt-2">
                <button className="px-4 py-1.5 rounded-full border border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  View Accounts
                </button>
              </div>
            </div>

            {/* Card 2: Grow Relationships */}
            <div 
              id="card-relationships"
              className={`bg-white p-5 rounded-xl border ${activeTourStep === 2 ? 'ring-4 ring-sky-500 border-sky-500 shadow-xl' : 'border-slate-200 shadow-sm'} relative transition-all`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Grow Relationships</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Contacts owned by me and created in the last 90 days</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-600">Active Sync</span>
                </div>
              </div>

              {/* Donut Chart & Legend Section */}
              <div className="flex items-center justify-center gap-8 py-5">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="3.2"
                      strokeDasharray="100, 100"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-bold text-slate-800 leading-none">2</span>
                    <span className="text-[10px] text-slate-500 font-medium">Contacts</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>2 Upcoming Activity</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>0 Past Activity</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>0 No Activity</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button className="px-4 py-1.5 rounded-full border border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  View Contacts
                </button>
              </div>
            </div>

            {/* Card 3: My Goals */}
            <div 
              id="card-goals"
              className={`bg-white p-5 rounded-xl border ${activeTourStep === 3 ? 'ring-4 ring-sky-500 border-sky-500 shadow-xl' : 'border-slate-200 shadow-sm'} relative transition-all`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">My Goals</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Set personal weekly or monthly goals for emails, calls, and meetings.</p>
                </div>
                <button className="text-slate-400 hover:text-slate-700">
                  <Settings size={14} />
                </button>
              </div>

              <div className="py-6 flex items-center justify-center gap-6">
                {/* Interactive Milestone Progress Bubbles */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold shadow-inner">
                    +
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center text-xs font-bold shadow-sm">
                    <CheckCircle size={18} />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-md ring-4 ring-blue-100">
                    <Star size={20} className="fill-white" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs shadow-inner">
                    <Users size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Today's Events */}
            <div 
              id="card-events"
              className={`bg-white p-5 rounded-xl border ${activeTourStep === 4 ? 'ring-4 ring-sky-500 border-sky-500 shadow-xl' : 'border-slate-200 shadow-sm'} relative transition-all`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Today's Events</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Upcoming meetings & customer calls</p>
                </div>
                <Calendar size={14} className="text-slate-400" />
              </div>

              <div className="py-4 space-y-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Q3 Enterprise Alignment</div>
                      <div className="text-[10px] text-slate-500">10:00 AM • Zoom Meeting</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-sky-100 text-sky-700 px-2 py-0.5 rounded">In 30m</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <div className="font-bold text-slate-800 text-xs">DAP Onboarding Kickoff</div>
                      <div className="text-[10px] text-slate-500">02:30 PM • Client Portal</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Confirmed</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* THE IN-APP DAP CREATOR STUDIO OVERLAY (Exact match to uploaded image!) */}
        {/* ========================================================================= */}
        {isStudioOpen && (
          <div 
            className={`absolute ${studioPosition === 'left' ? 'left-4' : 'right-4'} top-16 z-40 w-72 bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden font-sans transition-all duration-300 ease-in-out`}
          >
            {/* Studio Header Banner (Warm orange/terracotta top band) */}
            <div className="bg-gradient-to-r from-[#FF7A59] via-[#FA5A36] to-[#E83818] p-4 text-white relative overflow-hidden">
              {/* Window Controls */}
              <div className="flex items-center justify-end gap-1 mb-1.5 text-white/80">
                <button 
                  onClick={() => setStudioPosition(studioPosition === 'left' ? 'right' : 'left')}
                  className="p-1 hover:bg-white/20 rounded cursor-pointer transition-colors"
                  title={studioPosition === 'left' ? 'Move Right' : 'Move Left'}
                >
                  {studioPosition === 'left' ? <MoveRight size={13} /> : <MoveLeft size={13} />}
                </button>
                <button 
                  onClick={() => setIsStudioMinimized(!isStudioMinimized)}
                  className="p-1 hover:bg-white/20 rounded cursor-pointer transition-colors"
                  title="Minimize"
                >
                  <Minus size={13} />
                </button>
                <button 
                  onClick={() => setIsStudioOpen(false)}
                  className="p-1 hover:bg-white/20 rounded cursor-pointer transition-colors"
                  title="Close Studio"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Title & Slogan */}
              <h3 className="text-xs font-black tracking-tight leading-snug drop-shadow-sm pr-6">
                <strong className="text-white font-extrabold">Studio:</strong> Guide. Track. Get feedback. In context. All in one place.
              </h3>
            </div>

            {/* Studio Drawer Body */}
            {!isStudioMinimized && (
              <div className="p-3.5 space-y-4 max-h-[580px] overflow-y-auto bg-slate-50/50">
                
                {/* User & Preview Mode Toggle */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs font-bold text-slate-800">John</span>

                  {/* Preview Mode Switch Button */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Preview Mode</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !previewMode;
                        setPreviewMode(next);
                        if (next) startDemoTour();
                        else setActiveTourStep(null);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        previewMode ? 'bg-sky-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          previewMode ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* CONTENT Section */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                    CONTENT
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'flow', label: 'Flow', icon: Compass },
                      { id: 'link', label: 'Link', icon: Link2 },
                      { id: 'video', label: 'Video', icon: Video },
                    ].map(item => {
                      const Icon = item.icon;
                      const isSelected = selectedTool === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedTool(item.id);
                            startDemoTour();
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border bg-white cursor-pointer transition-all shadow-xs ${
                            isSelected 
                              ? 'border-sky-500 ring-2 ring-sky-200 text-sky-600 font-bold' 
                              : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={18} className="mb-1.5" />
                          <span className="text-[11px]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedTool('article');
                        setActiveTip('tip-accounts');
                      }}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
                    >
                      <FileText size={18} className="mb-1.5 text-slate-600" />
                      <span className="text-[11px] font-medium">Article</span>
                    </button>
                  </div>
                </div>

                {/* WIDGETS Section */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                    WIDGETS
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'beacon', label: 'Beacon', icon: Radio },
                      { id: 'smart-tip', label: 'Smart-tip', icon: MessageSquare },
                      { id: 'popup', label: 'Popup', icon: Layers },
                    ].map(item => {
                      const Icon = item.icon;
                      const isSelected = selectedTool === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedTool(item.id);
                            if (item.id === 'popup') setActiveModal(true);
                            else setActiveTip('tip-accounts');
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border bg-white cursor-pointer transition-all shadow-xs ${
                            isSelected 
                              ? 'border-sky-500 ring-2 ring-sky-200 text-sky-600 font-bold' 
                              : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={18} className="mb-1.5" />
                          <span className="text-[11px]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { id: 'launcher', label: 'Launcher', icon: Target },
                      { id: 'blocker', label: 'Blocker', icon: ShieldAlert },
                      { id: 'survey', label: 'Survey', icon: ClipboardList },
                    ].map(item => {
                      const Icon = item.icon;
                      const isSelected = selectedTool === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedTool(item.id);
                            setActiveModal(true);
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border bg-white cursor-pointer transition-all shadow-xs ${
                            isSelected 
                              ? 'border-sky-500 ring-2 ring-sky-200 text-sky-600 font-bold' 
                              : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={18} className="mb-1.5" />
                          <span className="text-[11px]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* LIVE SIMULATED WALKTHROUGH STEP OVERLAY (Step-by-step Tooltip) */}
        {/* ========================================================================= */}
        {activeTourStep !== null && (
          <div className="absolute z-50 bottom-8 right-8 bg-slate-950 text-white border border-sky-500/80 rounded-xl p-4 shadow-2xl max-w-sm animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                <Sparkles size={13} />
                <span>Walkthrough Tour • Step {activeTourStep} of 4</span>
              </div>
              <button 
                onClick={() => setActiveTourStep(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ×
              </button>
            </div>

            <h4 className="text-sm font-bold text-white mb-1">
              {activeTourStep === 1 && '1. Plan My Accounts Cockpit'}
              {activeTourStep === 2 && '2. Grow Relationships & Contacts'}
              {activeTourStep === 3 && '3. Milestone Target Tracker'}
              {activeTourStep === 4 && '4. Live Event Agenda'}
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {activeTourStep === 1 && 'This widget aggregates all accounts assigned to your portfolio with health breakdown and next scheduled touchpoints.'}
              {activeTourStep === 2 && 'Track new contacts added within the last 90 days and identify accounts requiring immediate relationship follow-up.'}
              {activeTourStep === 3 && 'Set daily and weekly sales sprint targets to systematically exceed quota milestones.'}
              {activeTourStep === 4 && 'Never miss an enterprise call. Your agenda syncs automatically with calendar providers.'}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <button
                onClick={() => setActiveTourStep(activeTourStep > 1 ? activeTourStep - 1 : null)}
                className="text-xs text-slate-400 hover:text-white font-medium"
              >
                {activeTourStep === 1 ? 'End Tour' : 'Back'}
              </button>

              <button
                onClick={() => setActiveTourStep(activeTourStep < 4 ? activeTourStep + 1 : null)}
                className="kenzo-btn-primary text-xs"
              >
                <span>{activeTourStep === 4 ? 'Finish Tour 🎉' : 'Next Step'}</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Modal Announcement Popup Simulator */}
        {activeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-slate-800 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                  <Layers size={18} />
                  <span>DAP Announcement Modal</span>
                </div>
                <button onClick={() => setActiveModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">Welcome to the New CRM Experience!</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We have upgraded your pipeline cockpit with real-time customer health scores, automated guided walkthroughs, and smart form validation tips.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setActiveModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Dismiss
                </button>
                <button 
                  onClick={() => { setActiveModal(false); startDemoTour(); }}
                  className="kenzo-btn-primary text-xs"
                >
                  Take 1-Min Guided Tour
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
