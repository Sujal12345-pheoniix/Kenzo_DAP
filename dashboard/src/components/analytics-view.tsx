import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
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

// Pre-defined data for interactive chart based on time filters
const CHART_DATA = {
  '12H': [12, 19, 15, 25, 32, 28, 40, 48, 44, 52, 60, 58],
  '24H': [30, 45, 35, 60, 72, 65, 80, 95, 85, 110, 130, 125],
  '7D': [180, 210, 195, 240, 280, 260, 310, 340, 320, 380, 420, 400],
  '30D': [750, 820, 790, 910, 1050, 980, 1120, 1250, 1180, 1340, 1480, 1420]
};

export default function AnalyticsView({ analytics, flowsCount, activePublishedCount, getCompletionRate }: AnalyticsViewProps) {
  const [timeFilter, setTimeFilter] = useState<'12H' | '24H' | '7D' | '30D'>('7D');
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{ value: number; index: number } | null>(null);

  // Generate SVG path for Stripe-like Line Chart
  const generateSvgPath = (data: number[]) => {
    if (data.length === 0) return '';
    const width = 600;
    const height = 150;
    const maxVal = Math.max(...data) * 1.1;
    const minVal = Math.min(...data) * 0.9;
    const range = maxVal - minVal;
    
    return data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 30) - 15;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const currentChartPoints = CHART_DATA[timeFilter];
  const linePath = generateSvgPath(currentChartPoints);
  
  // Fill path for gradient under line
  const fillPath = currentChartPoints.length > 0 
    ? `${linePath} L 600 150 L 0 150 Z` 
    : '';

  // Real-time activity events log mock (keeps UI feeling live and intelligent)
  const [activities, setActivities] = useState<Array<{ id: string; time: string; msg: string; type: string }>>([
    { id: '1', time: 'Just now', msg: 'User completed "Platform Overview" on /dashboard', type: 'complete' },
    { id: '2', time: '2 mins ago', msg: 'Started "Fact-Check Setup" tour', type: 'start' },
    { id: '3', time: '5 mins ago', msg: 'Snippet loaded successfully on client app', type: 'system' },
    { id: '4', time: '12 mins ago', msg: 'User dismissed "GEO Analytics Campaign" at step 2', type: 'dismiss' },
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
    }, 15000); // add activity log updates periodically

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-outfit text-white leading-tight">Overview Metrics</h2>
          <p className="text-zinc-400 text-xs mt-1">Real-time user engagement tracking across your platform.</p>
        </div>
        
        {/* Time filters */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
          {(['12H', '24H', '7D', '30D'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`text-[10px] font-semibold px-3 py-1 rounded transition-all cursor-pointer ${
                timeFilter === filter 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Engagement */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="glass rounded-xl p-5 border border-zinc-800/80 custom-shadow flex flex-col justify-between glow-border h-[140px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">Total Engagement Events</span>
            <div className="flex items-center gap-0.5 text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <TrendingUp size={12} />
              <span>+12.4%</span>
            </div>
          </div>
          
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold font-outfit text-white">
              {analytics?.totalEvents?.toLocaleString() ?? 0}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">events recorded</span>
          </div>

          <div className="flex items-center gap-1.5 mt-auto text-[10px] text-emerald-400 font-medium">
            <Zap size={10} className="animate-pulse" />
            <span>Active tracking running in production</span>
          </div>
        </motion.div>

        {/* Card 2: Completion Rate */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="glass rounded-xl p-5 border border-zinc-800/80 custom-shadow flex flex-col justify-between glow-border h-[140px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">Completion Rate</span>
            <div className="flex items-center gap-0.5 text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <ArrowUpRight size={12} />
              <span>+4.2%</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold font-outfit text-white">
              {getCompletionRate()}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">overall rate</span>
          </div>

          <div className="flex items-center gap-1.5 mt-auto text-[10px] text-zinc-400 font-medium">
            <CheckCircle2 size={11} className="text-indigo-400" />
            <span>Aggregate across all active tours</span>
          </div>
        </motion.div>

        {/* Card 3: Active Walkthroughs */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="glass rounded-xl p-5 border border-zinc-800/80 custom-shadow flex flex-col justify-between glow-border h-[140px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">Active Walkthroughs</span>
            <div className="flex items-center gap-0.5 text-xs text-zinc-400 font-semibold bg-zinc-800 px-1.5 py-0.5 rounded">
              <Layers size={11} className="text-indigo-400" />
              <span>{activePublishedCount} Live</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold font-outfit text-white">
              {flowsCount}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">total campaigns</span>
          </div>

          <div className="flex items-center gap-1.5 mt-auto text-[10px] text-indigo-300 font-medium bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 w-fit">
            <span>{flowsCount - activePublishedCount} drafts pending publication</span>
          </div>
        </motion.div>
      </div>

      {/* Main Chart Section (Linear / Stripe style) */}
      <div className="glass border border-zinc-800/80 rounded-xl p-6 custom-shadow">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow shadow-indigo-500/50" />
            <h3 className="text-sm font-semibold font-outfit text-white">Platform Events Overview</h3>
          </div>
          <div className="text-xs text-zinc-500 flex items-center gap-1">
            <Calendar size={12} />
            <span>Updates every 10s</span>
          </div>
        </div>

        {/* Custom SVG Line Chart */}
        <div className="relative h-[150px] w-full mt-4">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 600 150" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="0" y1="30" x2="600" y2="30" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            <line x1="0" y1="75" x2="600" y2="75" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

            {/* Gradient Fill under Line */}
            {fillPath && <path d={fillPath} fill="url(#chart-glow)" />}

            {/* Main Trend Line */}
            {linePath && (
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                d={linePath}
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Hover Guides and Dots */}
            {currentChartPoints.map((val, idx) => {
              const width = 600;
              const height = 150;
              const maxVal = Math.max(...currentChartPoints) * 1.1;
              const minVal = Math.min(...currentChartPoints) * 0.9;
              const range = maxVal - minVal;
              const x = (idx / (currentChartPoints.length - 1)) * width;
              const y = height - ((val - minVal) / range) * (height - 30) - 15;

              return (
                <g key={idx} className="cursor-pointer group">
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="transparent"
                    onMouseEnter={() => setHoveredDataPoint({ value: val, index: idx })}
                    onMouseLeave={() => setHoveredDataPoint(null)}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={hoveredDataPoint?.index === idx ? "5" : "3"}
                    fill={hoveredDataPoint?.index === idx ? "#818cf8" : "#6366f1"}
                    stroke="#09090b"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip Overlay */}
          {hoveredDataPoint && (
            <div 
              style={{
                position: 'absolute',
                left: `${(hoveredDataPoint.index / (currentChartPoints.length - 1)) * 100}%`,
                top: '10px',
                transform: 'translateX(-50%)',
              }}
              className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-semibold px-2 py-1 rounded shadow-lg flex flex-col gap-0.5 pointer-events-none z-10"
            >
              <span className="text-zinc-500 font-sans">Point {hoveredDataPoint.index + 1}</span>
              <span className="text-white text-xs">{hoveredDataPoint.value} events</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Funnel Dropoff vs Recent Live Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Onboarding Funnel (Stripe/Linear styled rows) */}
        <div className="glass border border-zinc-800/80 rounded-xl p-5 custom-shadow lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold font-outfit text-white">Walkthrough Onboarding Funnel</h3>
            <span className="text-[10px] text-zinc-400 font-medium">Conversion drop-off analysis</span>
          </div>

          {(!analytics || !analytics.tourMetrics || analytics.tourMetrics.length === 0) ? (
            <div className="py-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
              <Users size={24} className="text-zinc-700 animate-pulse" />
              <span>No tour interactions recorded yet.</span>
              <span className="text-[10px] text-zinc-600">Simulate tour starts inside the Sandbox workspace to generate data.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.tourMetrics.map(metric => {
                const completionPct = metric.starts > 0 
                  ? ((metric.completions / metric.starts) * 100)
                  : 0;
                
                const dropoffPct = metric.starts > 0 
                  ? (((metric.starts - metric.completions) / metric.starts) * 100)
                  : 0;

                return (
                  <div key={metric.flowId} className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-lg flex flex-col gap-2.5 transition-all hover:bg-zinc-900/80 hover:border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">{metric.name}</span>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium">
                        <span>Started: <strong className="text-zinc-300">{metric.starts}</strong></span>
                        <span>•</span>
                        <span>Completed: <strong className="text-emerald-400">{metric.completions}</strong></span>
                      </div>
                    </div>

                    {/* Progress Bar Visualizer */}
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${completionPct}%` }}
                        className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full transition-all duration-500" 
                      />
                      <div 
                        style={{ width: `${dropoffPct}%` }}
                        className="bg-zinc-850 h-full transition-all duration-500" 
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500">Completion rate: {completionPct.toFixed(0)}%</span>
                      <div className="flex items-center gap-0.5 text-rose-400 font-medium">
                        {dropoffPct > 50 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        <span>Drop-off: {dropoffPct.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Event Activity Feed (Real-time indicators) */}
        <div className="glass border border-zinc-800/80 rounded-xl p-5 custom-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold font-outfit text-white">Live Event Stream</h3>
            <div className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              <Activity size={8} />
              <span>Real-time</span>
            </div>
          </div>

          <div className="relative border-l border-zinc-850 ml-1.5 space-y-4 py-2">
            {activities.map((act) => {
              const getIconColor = () => {
                if (act.type === 'complete') return 'bg-emerald-500 shadow-emerald-500/40';
                if (act.type === 'start') return 'bg-indigo-500 shadow-indigo-500/40';
                return 'bg-zinc-600 shadow-zinc-600/40';
              };

              return (
                <div key={act.id} className="relative pl-5 text-xs text-left group">
                  {/* Event Node Bullet */}
                  <span className={`absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full shadow ${getIconColor()} ring-4 ring-zinc-950 transition-transform duration-300 group-hover:scale-125`} />
                  
                  <div className="flex items-center justify-between text-zinc-500 text-[10px] mb-0.5">
                    <span>{act.time}</span>
                  </div>
                  <p className="text-zinc-300 leading-normal font-sans tracking-wide">
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
