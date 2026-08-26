import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Edit2, 
  Copy, 
  X, 
  Plus, 
  Calendar, 
  Download, 
  Search, 
  ChevronRight, 
  Sparkles
} from 'lucide-react';

interface InsightsBuilderProps {
  apiKey: string;
  onBack?: () => void;
}

export default function InsightsBuilder({ apiKey, onBack }: InsightsBuilderProps) {
  // Title & Header State
  const [insightTitle, setInsightTitle] = useState('Enter Title for your Insight');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEventsSetupOpen, setIsEventsSetupOpen] = useState(true);

  // Events & Controls State
  const [metric, setMetric] = useState('Unique Users');
  const [chartType, setChartType] = useState('Pie Chart');
  const [dateRange, setDateRange] = useState('30D');

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Table State
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [selectedAll, setSelectedAll] = useState(true);
  const [totalCount, setTotalCount] = useState('413.9K');

  const defaultLegendItems = [
    { label: 'Flow Start / Self Help', color: '#6366f1', count: '8.9k', checked: true },
    { label: 'Flow Start/ Task List', color: '#eab308', count: '8.9k', checked: true },
    { label: 'Flow Start/ Slideshow', color: '#f97316', count: '8.9k', checked: true },
    { label: 'Flow Start/ User Action', color: '#a855f7', count: '8.9k', checked: true },
    { label: 'Flow Start/ Article', color: '#3b82f6', count: '8.9k', checked: true },
    { label: 'Flow Start / URL', color: '#14b8a6', count: '8.9k', checked: true },
    { label: 'Flow Start/ Live Tour', color: '#f43f5e', count: '8.9k', checked: true },
  ];

  const [rows, setRows] = useState(defaultLegendItems);

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const activeProjectId = localStorage.getItem('kenzo_active_project_id') || '';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (activeProjectId) headers['x-project-id'] = activeProjectId;
        if (apiKey) headers['x-api-key'] = apiKey;

        const res = await fetch('/api/v1/admin/analytics/query', {
          method: 'POST',
          headers,
          body: JSON.stringify({ metric, dateRange, chartType }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.chartData && data.chartData.length > 0) {
            const colors = ['#6366f1', '#eab308', '#f97316', '#a855f7', '#3b82f6', '#14b8a6', '#f43f5e'];
            const mappedRows = data.chartData.map((item: any, i: number) => ({
              label: `Flow Start / ${item.label}`,
              color: colors[i % colors.length],
              count: `${(item.value / 1000).toFixed(1)}k`,
              checked: true
            }));
            setRows(mappedRows);
            if (data.total) setTotalCount(data.total);
          }
        }
      } catch (err) {
        console.warn('Using fallback sample data for insights');
      }
    };
    fetchRealData();
  }, [metric, dateRange, chartType, apiKey]);

  const toggleRowCheck = (index: number) => {
    const updated = [...rows];
    updated[index].checked = !updated[index].checked;
    setRows(updated);
  };

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
        // Query completed
      }
    } catch (_) {
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8,Event,Flow origin,Unique Users\n" + 
      rows.map(r => `Flow Stat,${r.label},${r.count}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trend_insight_export.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-8 select-none relative text-left w-full text-slate-100">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-[#0b1324] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-sky-400">Insights Studio /</span>
            {isEditingTitle ? (
              <input
                type="text"
                value={insightTitle}
                onChange={(e) => setInsightTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                autoFocus
                className="text-xs font-medium border border-sky-400 rounded-lg px-2.5 py-1 outline-none bg-[#080e1a] text-white"
              />
            ) : (
              <div 
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-200 hover:text-white group"
              >
                <span>{insightTitle}</span>
                <Edit2 size={12} className="text-slate-500 group-hover:text-sky-400" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-[#0c1322] border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer" title="Duplicate Insight">
            <Copy size={14} />
          </button>
          <button className="kenzo-btn-primary text-xs">
            Save Insight
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Ask AI Prompt Bar */}
        <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
            placeholder="Query query analytics: 'Show drop-off rate for onboarding flow over the last 30 days'..."
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
          <button
            onClick={handleAskAi}
            disabled={isAiLoading}
            className="kenzo-btn-primary text-xs disabled:opacity-60"
          >
            {isAiLoading ? 'Analyzing...' : 'Generate Query'}
          </button>
        </div>

        {/* Events Setup Collapsible Box */}
        <div className="kenzo-glass-card rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#070d18]/60">
            <h2 className="text-sm font-bold font-syne text-white">Events Setup & User Breakdowns</h2>
            <button 
              onClick={() => setIsEventsSetupOpen(!isEventsSetupOpen)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {isEventsSetupOpen && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Add Events */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-300">Add Events</h3>
                <div className="bg-[#070d18] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <span className="font-bold text-xs text-white">Flow Start</span>
                    <div className="flex items-center gap-3 text-xs">
                      <button className="text-sky-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                        <Plus size={12} /> Filter
                      </button>
                      <button className="text-sky-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                        <Plus size={12} /> Breakdown
                      </button>
                    </div>
                  </div>

                  {/* Applied Filter Chips */}
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-sky-500/10 text-sky-300 border border-sky-500/25 px-3 py-1 rounded-xl text-xs flex items-center gap-2">
                      Flow name = Create lead in Salesforce + 3 Others
                      <X size={12} className="cursor-pointer hover:text-white" />
                    </span>
                    <span className="bg-sky-500/10 text-sky-300 border border-sky-500/25 px-3 py-1 rounded-xl text-xs flex items-center gap-2">
                      Flow origin
                      <X size={12} className="cursor-pointer hover:text-white" />
                    </span>
                  </div>

                  <button className="mt-2 bg-[#0b1324] border border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                    <Plus size={14} /> Add Event
                  </button>
                </div>
              </div>

              {/* Right Column: Select users by */}
              <div className="space-y-4 lg:border-l lg:border-slate-800/80 lg:pl-6">
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 mb-3">Select Users By</h3>
                  <div className="space-y-3">
                    <span className="bg-sky-500/10 text-sky-300 border border-sky-500/25 px-3 py-1 rounded-xl text-xs inline-flex items-center gap-2">
                      Browser = Chrome
                      <X size={12} className="cursor-pointer hover:text-white" />
                    </span>
                    <div>
                      <button className="bg-[#0b1324] border border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                        <Plus size={14} /> Add User Filter
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60">
                  <h3 className="text-xs font-semibold text-slate-300 mb-3">Group Users By</h3>
                  <button className="bg-[#0b1324] border border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                    <Plus size={14} /> Add User Breakdown
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chart Container */}
        <div className="kenzo-glass-card rounded-3xl p-6 space-y-8 shadow-2xl">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <div className="border border-slate-800 rounded-xl p-0.5 flex bg-[#070d18]">
                {(['7D', '30D', '90D'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      dateRange === r ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button className="bg-[#070d18] border border-slate-800 text-sky-400 text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                <Calendar size={13} />
                <span>11/03 - 31/03</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">Metric</label>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl text-xs font-medium px-3 py-1.5 text-white outline-none cursor-pointer"
                >
                  <option value="Unique Users" className="bg-[#0b1324] text-white">Unique Users</option>
                  <option value="Total Events" className="bg-[#0b1324] text-white">Total Events</option>
                  <option value="Completion Rate" className="bg-[#0b1324] text-white">Completion Rate</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">Chart Type</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl text-xs font-medium px-3 py-1.5 text-white outline-none cursor-pointer"
                >
                  <option value="Pie Chart" className="bg-[#0b1324] text-white">Pie Chart</option>
                  <option value="Line Chart" className="bg-[#0b1324] text-white">Line Chart</option>
                  <option value="Bar Chart" className="bg-[#0b1324] text-white">Bar Chart</option>
                </select>
              </div>
            </div>
          </div>

          {/* Donut Chart Display */}
          <div className="flex flex-col items-center justify-center space-y-8 py-6">
            <div className="relative w-64 h-64 rounded-full flex items-center justify-center shadow-2xl" style={{
              background: 'conic-gradient(#0284c7 0% 35%, #38bdf8 35% 54%, #f59e0b 54% 69%, #a855f7 69% 82%, #3b82f6 82% 91%, #14b8a6 91% 97%, #f43f5e 97% 100%)'
            }}>
              {/* Inner cutout for Donut */}
              <div className="w-36 h-36 bg-[#070d18] border border-slate-800 rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-3xl font-bold text-white tracking-tight">{totalCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">TOTAL EVENTS</span>
              </div>
            </div>

            {/* Labeled Color Legend */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 max-w-4xl text-xs font-medium text-slate-300">
              {rows.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="kenzo-glass-card rounded-3xl shadow-2xl overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white">
              <input 
                type="checkbox" 
                checked={selectedAll}
                onChange={(e) => {
                  setSelectedAll(e.target.checked);
                  setRows(rows.map(r => ({ ...r, checked: e.target.checked })));
                }}
                className="w-4 h-4 rounded text-sky-500 bg-[#070d18] border-slate-700 cursor-pointer" 
              />
              <span>Selected {rows.filter(r => r.checked).length} of {rows.length} Events</span>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportData}
                className="bg-[#0b1324] border border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-white font-semibold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} /> Export CSV
              </button>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#070d18] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none w-48 focus:border-sky-400"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#070d18]/70 border-b border-slate-800/80 font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 w-10 text-center"></th>
                  <th className="p-3.5">
                    <div className="flex items-center gap-1 cursor-pointer">
                      <span>Event</span>
                    </div>
                  </th>
                  <th className="p-3.5">
                    <div className="flex items-center gap-1 cursor-pointer">
                      <span>Flow Origin</span>
                    </div>
                  </th>
                  <th className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 cursor-pointer">
                      <span>Unique Users</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows
                  .filter(r => !searchQuery || r.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={() => toggleRowCheck(idx)}
                          className="w-4 h-4 rounded text-sky-500 bg-[#070d18] border-slate-700 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-medium text-white">Flow Stat</td>
                      <td className="p-3.5 font-medium text-slate-300">{row.label.replace('Flow Start / ', '').replace('Flow Start/ ', '')}</td>
                      <td className="p-3.5 text-right font-bold text-sky-400 font-mono">{row.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="px-6 py-3.5 bg-[#070d18]/40 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(e.target.value)}
                className="border border-slate-700 rounded-lg px-2 py-1 bg-[#0b1324] text-white outline-none"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>Entries</span>
            </div>

            <div className="flex items-center gap-4">
              <span>Showing 1 to {rows.length} of {rows.length} entries</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30" disabled>
                  <ChevronLeft size={14} />
                </button>
                <button className="px-3 py-1 bg-sky-500 text-white font-semibold rounded-lg">1</button>
                <button className="p-1.5 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
