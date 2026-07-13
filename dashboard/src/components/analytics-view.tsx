import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Layers, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Zap, 
  Users 
} from 'lucide-react';

interface AnalyticsViewProps {
  analytics: {
    totalEvents: number;
    eventsByType: Array<{ type: string; count: string }>;
    tourMetrics: Array<{
      flowId: string;
      name: string;
      starts: number;
      completions: number;
      dismissals: number;
    }>;
    stepMetrics: Array<{
      flowId: string;
      stepId: string;
      stepIndex: number;
      views: number;
    }>;
  } | null;
  flowsCount: number;
  activePublishedCount: number;
  getCompletionRate: () => string;
}

const CHART_DATA = {
  '12H': [18, 24, 15, 29, 38, 30, 48, 55, 42, 60, 68, 62],
  '24H': [35, 50, 40, 68, 80, 70, 92, 105, 90, 118, 135, 128],
  '7D': [190, 220, 205, 255, 295, 275, 325, 360, 335, 395, 435, 410],
  '30D': [780, 850, 810, 950, 1080, 1010, 1160, 1290, 1220, 1380, 1520, 1460]
};

export default function AnalyticsView({ analytics, flowsCount, activePublishedCount, getCompletionRate }: AnalyticsViewProps) {
  const [timeFilter, setTimeFilter] = useState<'12H' | '24H' | '7D' | '30D'>('7D');
  const [hoveredPoint, setHoveredPoint] = useState<{ val: number; idx: number } | null>(null);

  // Generate SVG path for Stripe-like graph
  const generateSvgPath = (data: number[]) => {
    if (data.length === 0) return '';
    const width = 640;
    const height = 120;
    const maxVal = Math.max(...data) * 1.1;
    const minVal = Math.min(...data) * 0.9;
    const range = maxVal - minVal || 1;

    return data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 30) - 15;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const currentChartPoints = CHART_DATA[timeFilter];
  const linePath = generateSvgPath(currentChartPoints);
  const fillPath = currentChartPoints.length > 0 
    ? `${linePath} L 640 120 L 0 120 Z` 
    : '';

  // Live activity telemetry mock
  const [activities, setActivities] = useState<Array<{ id: string; time: string; msg: string; type: string }>>([
    { id: '1', time: 'Just now', msg: 'User completed "Platform Overview" on /dashboard', type: 'complete' },
    { id: '2', time: '1 min ago', msg: 'Started "Fact-Check Setup" tour', type: 'start' },
    { id: '3', time: '4 mins ago', msg: 'Snippet loaded successfully on client app', type: 'system' },
    { id: '4', time: '10 mins ago', msg: 'User dismissed "GEO Analytics Campaign" at step 2', type: 'dismiss' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const types = ['start', 'complete', 'dismiss'];
      const tours = ['Platform Overview', 'Fact-Check Setup', 'GEO Analytics Campaign', 'Dashboard Workspace'];
      const randomTour = tours[Math.floor(Math.random() * tours.length)];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      let msg = '';
      if (randomType === 'start') msg = `Started "${randomTour}" tour`;
      else if (randomType === 'complete') msg = `User completed "${randomTour}" tour`;
      else msg = `User dismissed "${randomTour}" tour`;

      setActivities(prev => [
        { id: Date.now().toString(), time: 'Just now', msg, type: randomType },
        ...prev.slice(0, 3)
      ]);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-12 select-none text-left">
      
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-outfit text-white tracking-tight leading-tight">Overview Metrics</h2>
          <p className="text-zinc-500 text-xs mt-1">Real-time user engagement tracking across your platform.</p>
        </div>
        
        {/* Time filters */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl shadow-inner shadow-black/40">
          {(['12H', '24H', '7D', '30D'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                timeFilter === filter 
                  ? 'bg-zinc-800 text-white shadow shadow-black/40' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Elevated Cards Grid (Material Dashboard style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
        {/* KPI 1: Engagement Events */}
        <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-6 shadow-xl flex flex-col justify-between mt-4">
          {/* Floating Icon Header */}
          <div className="absolute -top-5 left-4 w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 ring-1 ring-white/10">
            <Activity className="text-white w-6 h-6" />
          </div>
          
          <div className="text-right space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Engagement Events</span>
            <div className="text-2xl font-bold font-outfit text-white">
              {analytics?.totalEvents?.toLocaleString() ?? 0}
            </div>
          </div>

          <div className="border-t border-zinc-850 mt-5 pt-3 flex items-center justify-between text-[10px] text-zinc-400">
            <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <ArrowUpRight size={10} />
              <span>+12.4%</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap size={10} className="text-amber-500 animate-pulse" />
              <span>Live tracking enabled</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Completion Rate */}
        <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-6 shadow-xl flex flex-col justify-between mt-4">
          {/* Floating Icon Header */}
          <div className="absolute -top-5 left-4 w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-1 ring-white/10">
            <CheckCircle2 className="text-white w-6 h-6" />
          </div>
          
          <div className="text-right space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Completion Rate</span>
            <div className="text-2xl font-bold font-outfit text-white">
              {getCompletionRate()}
            </div>
          </div>

          <div className="border-t border-zinc-850 mt-5 pt-3 flex items-center justify-between text-[10px] text-zinc-400">
            <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <ArrowUpRight size={10} />
              <span>+4.2%</span>
            </div>
            <span>Across all active tours</span>
          </div>
        </div>

        {/* KPI 3: Active Walkthroughs */}
        <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-6 shadow-xl flex flex-col justify-between mt-4">
          {/* Floating Icon Header */}
          <div className="absolute -top-5 left-4 w-14 h-14 bg-gradient-to-tr from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
            <Layers className="text-white w-6 h-6" />
          </div>
          
          <div className="text-right space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Active Walkthroughs</span>
            <div className="text-2xl font-bold font-outfit text-white">
              {activePublishedCount} <span className="text-xs text-zinc-500 font-normal">/ {flowsCount}</span>
            </div>
          </div>

          <div className="border-t border-zinc-850 mt-5 pt-3 flex items-center justify-between text-[10px] text-zinc-400">
            <span className="text-zinc-500">Live tours active</span>
            <div className="text-[9px] bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 rounded text-zinc-300 font-bold">
              {flowsCount - activePublishedCount} drafts pending
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chart Header Card (Material style) */}
      <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-6 shadow-xl mt-12">
        {/* Floating Gradient Chart Header */}
        <div className="absolute -top-6 left-4 right-4 h-40 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-xl p-3 shadow-lg shadow-indigo-600/30 ring-1 ring-white/10 flex items-center justify-center">
          
          <div className="relative h-full w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 640 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* White glowing grid lines */}
              <line x1="0" y1="20" x2="640" y2="20" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              <line x1="0" y1="60" x2="640" y2="60" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              <line x1="0" y1="100" x2="640" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />

              {/* Chart Gradient Fill */}
              {fillPath && <path d={fillPath} fill="url(#glow)" />}

              {/* White main line */}
              {linePath && (
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                  d={linePath}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              )}

              {/* Chart point coordinates */}
              {currentChartPoints.map((val, idx) => {
                const width = 640;
                const height = 120;
                const maxVal = Math.max(...currentChartPoints) * 1.1;
                const minVal = Math.min(...currentChartPoints) * 0.9;
                const range = maxVal - minVal || 1;
                const x = (idx / (currentChartPoints.length - 1)) * width;
                const y = height - ((val - minVal) / range) * (height - 30) - 15;

                return (
                  <g key={idx} className="cursor-pointer">
                    <circle
                      cx={x}
                      cy={y}
                      r="7"
                      fill="transparent"
                      onMouseEnter={() => setHoveredPoint({ val, idx })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={hoveredPoint?.idx === idx ? "4.5" : "2.5"}
                      fill="#ffffff"
                      stroke="#4f46e5"
                      strokeWidth="1.5"
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip inside the chart block */}
            {hoveredPoint && (
              <div 
                style={{
                  position: 'absolute',
                  left: `${(hoveredPoint.idx / (currentChartPoints.length - 1)) * 100}%`,
                  top: '5px',
                  transform: 'translateX(-50%)',
                }}
                className="bg-white text-zinc-900 border border-zinc-200 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none flex flex-col"
              >
                <span>{hoveredPoint.val} events</span>
              </div>
            )}
          </div>
        </div>

        {/* Content details at the bottom of the card */}
        <div className="pt-36">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-outfit text-white">Daily Platform Events</h3>
              <p className="text-zinc-500 text-xs mt-0.5">Campaign performance overview.</p>
            </div>
            <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-semibold">
              <Calendar size={12} />
              <span>Updates every 10s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Funnel Table (Material style) & Event Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Onboarding Funnel (Material elevated header table) */}
        <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-8 shadow-xl lg:col-span-2 mt-4">
          {/* Floating purple Header */}
          <div className="absolute -top-5 left-4 right-4 h-12 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl flex items-center justify-between px-5 shadow-lg shadow-violet-600/20 ring-1 ring-white/10">
            <h3 className="text-xs font-bold font-outfit text-white uppercase tracking-wider">Walkthrough Onboarding Funnel</h3>
            <span className="text-[10px] text-indigo-200 font-bold">Conversion rates</span>
          </div>

          <div className="mt-8 space-y-4">
            {(!analytics || !analytics.tourMetrics || analytics.tourMetrics.length === 0) ? (
              <div className="py-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                <Users size={24} className="text-zinc-700 animate-pulse" />
                <span>No tour metrics logged. Run sandbox walkthroughs to feed database.</span>
              </div>
            ) : (
              <div className="divide-y divide-zinc-850">
                {analytics.tourMetrics.map(metric => {
                  const completionPct = metric.starts > 0 
                    ? ((metric.completions / metric.starts) * 100)
                    : 0;
                  
                  const dropoffPct = metric.starts > 0 
                    ? (((metric.starts - metric.completions) / metric.starts) * 100)
                    : 0;

                  return (
                    <div key={metric.flowId} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">{metric.name}</span>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-semibold">
                          <span>Starts: <strong className="text-zinc-300">{metric.starts}</strong></span>
                          <span>•</span>
                          <span>Completions: <strong className="text-emerald-400">{metric.completions}</strong></span>
                        </div>
                      </div>

                      {/* Material themed progress bar */}
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden flex border border-zinc-850">
                        <div 
                          style={{ width: `${completionPct}%` }}
                          className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                        />
                        <div 
                          style={{ width: `${dropoffPct}%` }}
                          className="bg-zinc-850 h-full transition-all duration-500" 
                        />
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-bold tracking-wider">
                        <span className="text-zinc-500">CONVERSION: {completionPct.toFixed(0)}%</span>
                        <div className="flex items-center gap-0.5 text-rose-500">
                          {dropoffPct > 50 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          <span>DROPOFF: {dropoffPct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live event logs (Material card with blue header) */}
        <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-8 shadow-xl mt-4">
          {/* Floating Blue Header */}
          <div className="absolute -top-5 left-4 right-4 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-between px-5 shadow-lg shadow-blue-600/20 ring-1 ring-white/10">
            <h3 className="text-xs font-bold font-outfit text-white uppercase tracking-wider">Live Event Stream</h3>
            <div className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              <span>Live</span>
            </div>
          </div>

          <div className="mt-8 relative border-l border-zinc-800 ml-1.5 space-y-5 py-2">
            {activities.map((act) => {
              const getIconColor = () => {
                if (act.type === 'complete') return 'bg-emerald-500 shadow-emerald-500/40';
                if (act.type === 'start') return 'bg-indigo-500 shadow-indigo-500/40';
                return 'bg-zinc-700 shadow-zinc-700/40';
              };

              return (
                <div key={act.id} className="relative pl-5 text-xs text-left group">
                  {/* Event bullet */}
                  <span className={`absolute left-[-4.5px] top-1.5 w-2.5 h-2.5 rounded-full shadow ${getIconColor()} ring-4 ring-zinc-900 transition-transform duration-300 group-hover:scale-125`} />
                  
                  <div className="flex items-center justify-between text-zinc-500 text-[9px] font-bold uppercase tracking-wider mb-0.5">
                    <span>{act.time}</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-sans tracking-wide">
                    {act.msg}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
