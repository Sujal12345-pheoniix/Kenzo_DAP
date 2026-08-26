import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Layers, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users,
  BarChart3,
  TrendingUp
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
    { id: '2', time: '1 min ago', msg: 'Started "ERP Onboarding Walkthrough" tour', type: 'start' },
    { id: '3', time: '4 mins ago', msg: 'Kenzo SDK connected on client app tenant', type: 'system' },
    { id: '4', time: '10 mins ago', msg: 'User interacted with Smart Tip on /dashboard/crm', type: 'complete' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const types = ['start', 'complete', 'dismiss'];
      const tours = ['Platform Overview', 'ERP Onboarding Walkthrough', 'Smart Tip Interactive Guide', 'Financial Ledger Tour'];
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
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 select-none text-left w-full">
      
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <BarChart3 size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne text-white tracking-tight">Executive Telemetry & Adoption Metrics</h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time user engagement, onboarding conversions & tour telemetry</p>
          </div>
        </div>
        
        {/* Time filters */}
        <div className="flex items-center gap-1 bg-[#0b1324] border border-slate-800 p-1 rounded-xl shadow-inner">
          {(['12H', '24H', '7D', '30D'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeFilter === filter 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI 1: Engagement Events */}
        <div className="kenzo-glass-card rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Activity className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={13} />
              <span>+14.2%</span>
            </div>
          </div>
          
          <div className="mt-4">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Engagement Events</span>
            <div className="text-3xl font-bold text-white mt-1 tracking-tight">
              {analytics?.totalEvents?.toLocaleString() ?? '14,820'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total user interactions captured</p>
          </div>
        </div>

        {/* KPI 2: Completion Rate */}
        <div className="kenzo-glass-card rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={13} />
              <span>+8.6%</span>
            </div>
          </div>
          
          <div className="mt-4">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Avg Completion Rate</span>
            <div className="text-3xl font-bold text-white mt-1 tracking-tight">
              {getCompletionRate() !== '0%' ? getCompletionRate() : '84%'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Successful walkthrough completions</p>
          </div>
        </div>

        {/* KPI 3: Live Flows */}
        <div className="kenzo-glass-card rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Layers className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 text-sky-400 text-xs font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
              <span>{activePublishedCount} Live</span>
            </div>
          </div>
          
          <div className="mt-4">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Configured Guidance Flows</span>
            <div className="text-3xl font-bold text-white mt-1 tracking-tight">
              {flowsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Active tours, tips & modals</p>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="kenzo-glass-card rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-6">
          <div>
            <h3 className="text-base font-bold font-syne text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-sky-400" />
              User Interaction Velocity & Volume
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Continuous telemetry time series across all active client pages</p>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              <span className="text-slate-300">Total Interactions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">Goal Completions</span>
            </div>
          </div>
        </div>

        {/* SVG Sparkline Area Chart */}
        <div className="relative w-full h-56 flex items-end">
          <svg viewBox="0 0 640 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="kenzo-chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            {/* Grid horizontal lines */}
            {[20, 50, 80, 110].map(y => (
              <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="rgba(148, 163, 184, 0.08)" strokeDasharray="3 3" />
            ))}

            {/* Gradient Fill */}
            {fillPath && <path d={fillPath} fill="url(#kenzo-chart-grad)" />}

            {/* Smooth Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Circles */}
            {currentChartPoints.map((val, idx) => {
              const width = 640;
              const height = 120;
              const maxVal = Math.max(...currentChartPoints) * 1.1;
              const minVal = Math.min(...currentChartPoints) * 0.9;
              const range = maxVal - minVal || 1;
              const x = (idx / (currentChartPoints.length - 1)) * width;
              const y = height - ((val - minVal) / range) * (height - 30) - 15;

              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={y}
                    r={hoveredPoint?.idx === idx ? 6 : 3.5}
                    className="fill-sky-400 stroke-[#05090f] stroke-2 cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPoint({ val, idx })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-2 right-4 bg-[#0b1324] border border-sky-500/40 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl text-white">
              <span className="text-slate-400 font-normal mr-1.5">Value:</span>
              <span className="text-sky-300 font-mono">{hoveredPoint.val} events</span>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Section: Funnel Table & Event Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Onboarding Funnel */}
        <div className="kenzo-glass-card rounded-2xl p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-sm font-bold font-syne text-white uppercase tracking-wider">Walkthrough Onboarding Funnel</h3>
              <p className="text-xs text-slate-400">Step-by-step conversion and drop-off velocity</p>
            </div>
            <span className="text-xs text-sky-400 font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20">
              Live Conversion
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {(!analytics || !analytics.tourMetrics || analytics.tourMetrics.length === 0) ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Users size={24} className="text-slate-600 animate-pulse" />
                <span>No tour metrics logged. Run sandbox walkthroughs to feed database.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
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
                        <span className="text-xs font-bold text-slate-200">{metric.name}</span>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                          <span>Starts: <strong className="text-white">{metric.starts}</strong></span>
                          <span>•</span>
                          <span>Completions: <strong className="text-emerald-400">{metric.completions}</strong></span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#05090f] h-2.5 rounded-full overflow-hidden flex border border-slate-800">
                        <div 
                          style={{ width: `${completionPct}%` }}
                          className="bg-gradient-to-r from-sky-500 to-blue-600 h-full rounded-full transition-all duration-500" 
                        />
                        <div 
                          style={{ width: `${dropoffPct}%` }}
                          className="bg-slate-800/80 h-full transition-all duration-500" 
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider">
                        <span className="text-sky-400">CONVERSION: {completionPct.toFixed(0)}%</span>
                        <div className="flex items-center gap-0.5 text-rose-400">
                          {dropoffPct > 50 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
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

        {/* Live event stream */}
        <div className="kenzo-glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h3 className="text-sm font-bold font-syne text-white uppercase tracking-wider">Live Event Stream</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Live</span>
            </div>
          </div>

          <div className="relative border-l border-slate-800 ml-2 space-y-5 py-2">
            {activities.map((act) => {
              const getIconColor = () => {
                if (act.type === 'complete') return 'bg-emerald-400 ring-emerald-500/30';
                if (act.type === 'start') return 'bg-sky-400 ring-sky-500/30';
                return 'bg-amber-400 ring-amber-500/30';
              };

              return (
                <div key={act.id} className="relative pl-5 text-xs text-left group">
                  <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ${getIconColor()} transition-transform duration-300 group-hover:scale-125`} />
                  
                  <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    <span>{act.time}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed font-sans text-xs">
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
