import { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Filter, 
  Plus, 
  X, 
  Download, 
  Sparkles, 
  Layers, 
  Users 
} from 'lucide-react';

interface EventChip {
  id: string;
  eventName: string;
  filters: string[];
  breakdowns: string[];
}

interface InsightsBuilderProps {
  apiKey: string;
}

export default function InsightsBuilder({ apiKey }: InsightsBuilderProps) {
  // Query State
  const [insightType, setInsightType] = useState<'trend' | 'funnel' | 'journey'>('trend');
  const [events, setEvents] = useState<EventChip[]>([
    { id: 'ev-1', eventName: 'Flow Start', filters: ['Status = Active'], breakdowns: ['Browser'] },
  ]);
  const [userFilters, setUserFilters] = useState<string[]>(['Browser = Chrome']);
  const [userBreakdowns, setUserBreakdowns] = useState<string[]>(['Country']);
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D'>('30D');
  const [metric, setMetric] = useState<'unique_users' | 'total_events' | 'completion_rate'>('unique_users');
  const [chartType, setChartType] = useState<'donut' | 'line' | 'bar' | 'funnel'>('donut');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Results State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    total: string;
    metric: string;
    chartData: { label: string; value: number; percentage: number }[];
    tableRows: { event: string; breakdown: string; metricValue: number }[];
  }>({
    total: '413.9K',
    metric: 'unique_users',
    chartData: [
      { label: 'Chrome', value: 245100, percentage: 59.2 },
      { label: 'Safari', value: 112400, percentage: 27.2 },
      { label: 'Firefox', value: 56400, percentage: 13.6 },
    ],
    tableRows: [
      { event: 'Flow Start', breakdown: 'Chrome', metricValue: 245100 },
      { event: 'Flow Start', breakdown: 'Safari', metricValue: 112400 },
      { event: 'Flow Start', breakdown: 'Firefox', metricValue: 56400 },
    ],
  });

  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});

  const runQuery = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/analytics/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || 'kenzo_project_dev_api_key_2026',
        },
        body: JSON.stringify({
          insightType,
          events: events.map((e) => e.eventName),
          userFilters,
          userBreakdowns,
          dateRange,
          metric,
          chartType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (_) {
      // Keep state on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runQuery();
  }, [insightType, dateRange, metric, chartType]);

  const handleAskAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/v1/admin/analytics/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || 'kenzo_project_dev_api_key_2026',
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          setResult(data.result);
        }
      }
    } catch (_) {
    } finally {
      setIsAiLoading(false);
    }
  };

  const addEvent = () => {
    const newEv: EventChip = {
      id: `ev-${Date.now()}`,
      eventName: 'Step Completed',
      filters: [],
      breakdowns: [],
    };
    setEvents([...events, newEv]);
  };

  const removeEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
  };

  const exportCsv = () => {
    const rows = result.tableRows.map((r) => `${r.event},${r.breakdown},${r.metricValue}`).join('\n');
    const blob = new Blob([`Event,Breakdown,MetricValue\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kenzo-insights-${insightType}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 p-8 bg-zinc-950 text-zinc-100 overflow-y-auto space-y-8">
      {/* Top Header & Ask-AI Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <BarChart2 className="w-7 h-7 text-indigo-400" />
            Insights & Behavior Analytics
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Build multi-event trend, funnel, and journey insights with cohort segmentation & Ask-AI.
          </p>
        </div>

        {/* Insight Type Tabs */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['trend', 'funnel', 'journey'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setInsightType(type)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                insightType === type
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {type} Insight
            </button>
          ))}
        </div>
      </div>

      {/* Ask AI Prompt Bar */}
      <div className="relative flex items-center bg-gradient-to-r from-indigo-950/40 via-zinc-900 to-purple-950/40 border border-indigo-500/30 rounded-2xl p-2 shadow-xl">
        <Sparkles className="w-5 h-5 text-indigo-400 ml-3 shrink-0" />
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
          placeholder="Ask AI: 'Show drop-off rate for onboarding flow over the last 30 days by browser'..."
          className="w-full bg-transparent px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
        />
        <button
          onClick={handleAskAi}
          disabled={isAiLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shrink-0 transition-all"
        >
          {isAiLoading ? 'Analyzing...' : 'Generate Insight'}
        </button>
      </div>

      {/* Events Setup Panel (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
        {/* Column 1: Add Events */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            1. Events Setup
          </h2>
          <div className="space-y-3">
            {events.map((ev, idx) => (
              <div key={ev.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-sm text-white">{ev.eventName}</span>
                  </div>
                  {events.length > 1 && (
                    <button onClick={() => removeEvent(ev.id)} className="text-zinc-500 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter and Breakdown Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {ev.filters.map((f, i) => (
                    <span key={i} className="bg-indigo-950 border border-indigo-700/50 text-indigo-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                      <Filter className="w-3 h-3" /> {f}
                    </span>
                  ))}
                  {ev.breakdowns.map((b, i) => (
                    <span key={i} className="bg-purple-950 border border-purple-700/50 text-purple-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                      <BarChart2 className="w-3 h-3" /> {b}
                    </span>
                  ))}
                  <button className="text-zinc-400 hover:text-indigo-400 font-medium text-xs flex items-center gap-1 bg-zinc-800/60 px-2 py-1 rounded-md">
                    <Plus className="w-3 h-3" /> Filter
                  </button>
                  <button className="text-zinc-400 hover:text-purple-400 font-medium text-xs flex items-center gap-1 bg-zinc-800/60 px-2 py-1 rounded-md">
                    <Plus className="w-3 h-3" /> Breakdown
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addEvent}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            Add Event
          </button>
        </div>

        {/* Column 2: User Selectors & Cohort Grouping */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            2. User Cohort Filters & Segmentation
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-2 block">Select users by (User Filters)</label>
              <div className="flex flex-wrap gap-2">
                {userFilters.map((uf, i) => (
                  <span key={i} className="bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                    {uf}
                    <X className="w-3.5 h-3.5 text-zinc-400 hover:text-white cursor-pointer" onClick={() => setUserFilters(userFilters.filter((_, idx) => idx !== i))} />
                  </span>
                ))}
                <button
                  onClick={() => setUserFilters([...userFilters, 'Role = Admin'])}
                  className="bg-zinc-900 border border-dashed border-zinc-700 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add User Filter
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-medium mb-2 block">Group users by (User Breakdown)</label>
              <div className="flex flex-wrap gap-2">
                {userBreakdowns.map((ub, i) => (
                  <span key={i} className="bg-purple-950/80 border border-purple-800 text-purple-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                    {ub}
                    <X className="w-3.5 h-3.5 text-purple-400 hover:text-white cursor-pointer" onClick={() => setUserBreakdowns(userBreakdowns.filter((_, idx) => idx !== i))} />
                  </span>
                ))}
                <button
                  onClick={() => setUserBreakdowns([...userBreakdowns, 'Plan'])}
                  className="bg-zinc-900 border border-dashed border-zinc-700 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add User Breakdown
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Panel & Controls */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/60 pb-4">
          <div className="flex items-center gap-3">
            {/* Metric Dropdown */}
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none"
            >
              <option value="unique_users">Unique Users</option>
              <option value="total_events">Total Events</option>
              <option value="completion_rate">Completion Rate</option>
            </select>
            {loading && <span className="text-xs text-indigo-400 font-medium animate-pulse">Updating...</span>}

            {/* Chart Type Dropdown */}
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none"
            >
              <option value="donut">Pie / Donut Chart</option>
              <option value="line">Line / Trend Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="funnel">Funnel Drop-off</option>
            </select>
          </div>

          {/* Date Range Presets */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {(['7D', '30D', '90D'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  dateRange === r ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Chart Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center min-h-[260px]">
          {/* Total Metric Centerpiece */}
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800/80 rounded-2xl">
            <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Total Metric</span>
            <span className="text-4xl font-extrabold text-white mt-2">{result.total}</span>
            <span className="text-xs text-indigo-400 font-semibold mt-1 capitalize">{result.metric.replace('_', ' ')}</span>
          </div>

          {/* Chart Display */}
          <div className="md:col-span-2 flex items-center justify-center p-6 bg-zinc-950 border border-zinc-800/80 rounded-2xl">
            {chartType === 'donut' && (
              <div className="flex flex-col sm:flex-row items-center gap-8 w-full justify-around">
                <div className="relative w-40 h-40 rounded-full border-8 border-indigo-500 border-t-purple-500 border-r-emerald-500 flex items-center justify-center shadow-2xl">
                  <span className="text-lg font-bold text-white">{result.total}</span>
                </div>
                <div className="space-y-2">
                  {result.chartData.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                      <span className="text-zinc-300 font-medium">{d.label}</span>
                      <span className="text-zinc-500">({d.percentage}%)</span>
                      <span className="font-bold text-white ml-auto">{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartType === 'funnel' && (
              <div className="w-full space-y-3">
                {result.chartData.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-zinc-300">
                      <span>{d.label}</span>
                      <span>{d.value.toLocaleString()} ({d.percentage}%)</span>
                    </div>
                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table Panel */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-200">
              Selected {Object.keys(selectedRows).length} of {result.tableRows.length} Events
            </span>
          </div>
          <button
            onClick={exportCsv}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto border border-zinc-800 rounded-xl">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input type="checkbox" className="rounded bg-zinc-900 border-zinc-700" />
                </th>
                <th className="p-3">Event Name</th>
                <th className="p-3">Breakdown Dimension</th>
                <th className="p-3 text-right">Metric Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {result.tableRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!selectedRows[idx]}
                      onChange={(e) => setSelectedRows({ ...selectedRows, [idx]: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700"
                    />
                  </td>
                  <td className="p-3 font-semibold text-white">{row.event}</td>
                  <td className="p-3 text-purple-300 font-medium">{row.breakdown}</td>
                  <td className="p-3 text-right font-bold text-indigo-400">{row.metricValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
