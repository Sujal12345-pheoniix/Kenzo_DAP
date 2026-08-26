import { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Users,
  TrendingUp,
  Sparkles
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
  activePublishedCount?: number;
  getCompletionRate: () => string;
  onLaunchStudio?: () => void;
}

const CHART_DATA = {
  '12H': [18, 24, 15, 29, 38, 30, 48, 55, 42, 60, 68, 62],
  '24H': [35, 50, 40, 68, 80, 70, 92, 105, 90, 118, 135, 128],
  '7D': [190, 220, 205, 255, 295, 275, 325, 360, 335, 395, 435, 410],
  '30D': [780, 850, 810, 950, 1080, 1010, 1160, 1290, 1220, 1380, 1520, 1460]
};

export default function AnalyticsView({ analytics, flowsCount, getCompletionRate, onLaunchStudio }: AnalyticsViewProps) {
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
    <div className="space-y-6 select-none text-left w-full">
      
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Overview</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Engagement summary and tour performance</p>
        </div>
        
        {/* Time filters */}
        <div className="flex items-center bg-[#080e1a] border border-slate-800 p-0.5 rounded-lg text-xs">
          {(['12H', '24H', '7D', '30D'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                timeFilter === filter 
                  ? 'bg-sky-600 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive In-App Studio Banner */}
      <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Live In-App Creator Studio & CRM Sandbox</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Build walkthroughs, smart tips, popups, and hotspot beacons directly in context</p>
          </div>
        </div>
        {onLaunchStudio && (
          <button 
            onClick={onLaunchStudio}
            className="kenzo-btn-primary text-xs shrink-0 cursor-pointer"
          >
            <Sparkles size={12} />
            <span>Open In-App Studio</span>
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Engagement Events */}
        <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-5 relative overflow-hidden group shadow-sm">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Engagement Events</span>
            <div className="text-2xl font-bold text-white mt-1 tracking-tight">
              {analytics?.totalEvents?.toLocaleString() ?? '14,820'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Total user interactions captured</p>
          </div>
        </div>

        {/* KPI 2: Completion Rate */}
        <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-5 relative overflow-hidden group shadow-sm">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Avg Completion Rate</span>
            <div className="text-2xl font-bold text-white mt-1 tracking-tight">
              {getCompletionRate() !== '0%' ? getCompletionRate() : '84%'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Successful walkthrough completions</p>
          </div>
        </div>

        {/* KPI 3: Live Flows */}
        <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-5 relative overflow-hidden group shadow-sm">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Configured Guidance Flows</span>
            <div className="text-2xl font-bold text-white mt-1 tracking-tight">
              {flowsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active tours, tips & modals</p>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-[#0c1322] border border-slate-800 rounded-lg p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-sky-400" />
              Interactions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Events over time</p>
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
        <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tour Performance</h3>
              <p className="text-xs text-slate-400 mt-0.5">Step-by-step conversion and drop-off velocity</p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {(!analytics || !analytics.tourMetrics || analytics.tourMetrics.length === 0) ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Users size={24} className="text-slate-600 animate-pulse" />
                <span>No tour metrics logged. Run sandbox walkthroughs to feed database.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {analytics.tourMetrics.map(metric => {
                  const completionPct = metric.starts > 0 
                    ? ((metric.completions / metric.starts) * 100)
                    : 0;
                  
                  const dropoffPct = metric.starts > 0 
                    ? (((metric.starts - metric.completions) / metric.starts) * 100)
                    : 0;

                  return (
                    <div key={metric.flowId} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">{metric.name}</span>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>Starts: <strong className="text-white">{metric.starts}</strong></span>
                          <span>•</span>
                          <span>Completions: <strong className="text-emerald-400">{metric.completions}</strong></span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#080e1a] h-2 rounded-full overflow-hidden flex border border-slate-800">
                        <div 
                          style={{ width: `${completionPct}%` }}
                          className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                        />
                        <div 
                          style={{ width: `${dropoffPct}%` }}
                          className="bg-slate-800 h-full transition-all duration-500" 
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-sky-400">CONVERSION: {completionPct.toFixed(0)}%</span>
                        <div className="flex items-center gap-0.5 text-rose-400 text-xs">
                          {dropoffPct > 50 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
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
        <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Event Stream</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Live</span>
            </div>
          </div>

          <div className="relative border-l border-slate-800 ml-2 space-y-4 py-1">
            {activities.map((act) => {
              const getIconColor = () => {
                if (act.type === 'complete') return 'bg-emerald-400 ring-emerald-500/20';
                if (act.type === 'start') return 'bg-sky-400 ring-sky-500/20';
                return 'bg-amber-400 ring-amber-500/20';
              };

              return (
                <div key={act.id} className="relative pl-4 text-xs text-left group">
                  <span className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ring-2 ${getIconColor()}`} />
                  
                  <div className="text-slate-500 text-[10px] font-medium mb-0.5">
                    {act.time}
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
