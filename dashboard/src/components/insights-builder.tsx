import { useState } from 'react';
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

  // Default color palette matching screenshot
  const legendItems = [
    { label: 'Flow Start / Self Help', color: '#6366f1', value: '144.9K', count: '8.9k', checked: true },
    { label: 'Flow Start/ Task List', color: '#eab308', value: '78.2K', count: '8.9k', checked: true },
    { label: 'Flow Start/ Slideshow', color: '#f97316', value: '62.1K', count: '8.9k', checked: true },
    { label: 'Flow Start/ User Action', color: '#a855f7', value: '54.0K', count: '8.9k', checked: true },
    { label: 'Flow Start/ Article', color: '#3b82f6', value: '38.2K', count: '8.9k', checked: true },
    { label: 'Flow Start / URL', color: '#14b8a6', value: '24.5K', count: '8.9k', checked: true },
    { label: 'Flow Start/ Live Tour', color: '#f43f5e', value: '12.0K', count: '8.9k', checked: true },
  ];

  const [rows, setRows] = useState(legendItems);

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
    <div className="min-h-screen bg-[#f3f4f6] text-[#1f2937] font-sans antialiased pb-16">
      {/* Top Header Bar matching Whatfix screenshot */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>
          <div className="h-4 w-[1px] bg-gray-300" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">Trend Insight /</span>
            {isEditingTitle ? (
              <input
                type="text"
                value={insightTitle}
                onChange={(e) => setInsightTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                autoFocus
                className="text-sm font-medium border border-orange-400 rounded px-2 py-0.5 outline-none bg-orange-50 text-gray-900"
              />
            ) : (
              <div 
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <span>{insightTitle}</span>
                <Edit2 size={13} className="text-gray-500" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors" title="Duplicate Insight">
            <Copy size={15} />
          </button>
          <button className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-5 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors">
            Save
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Ask AI Prompt Bar */}
        <div className="bg-gradient-to-r from-orange-50 via-white to-amber-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <Sparkles className="w-5 h-5 text-orange-600 shrink-0" />
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
            placeholder="Ask AI: 'Show drop-off rate for onboarding flow over the last 30 days by browser'..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-500 outline-none"
          />
          <button
            onClick={handleAskAi}
            disabled={isAiLoading}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            {isAiLoading ? 'Analyzing...' : 'Generate'}
          </button>
        </div>

        {/* Events Setup Collapsible Box matching screenshot */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-base font-bold text-gray-800">Events setup</h2>
            <button 
              onClick={() => setIsEventsSetupOpen(!isEventsSetupOpen)}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <X size={18} />
            </button>
          </div>

          {isEventsSetupOpen && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Add Events */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Add Events</h3>
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="font-semibold text-sm text-gray-900">Flow Start</span>
                    <div className="flex items-center gap-3 text-xs">
                      <button className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                        <Plus size={12} /> Filter
                      </button>
                      <button className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                        <Plus size={12} /> Breakdown
                      </button>
                    </div>
                  </div>

                  {/* Applied Filter Chips */}
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                      Flow name = Create lead in Salesforce + 3 Others
                      <X size={12} className="cursor-pointer hover:text-blue-900" />
                    </span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                      Flow origin
                      <X size={12} className="cursor-pointer hover:text-blue-900" />
                    </span>
                  </div>

                  <button className="mt-2 border border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors">
                    <Plus size={14} /> Add Event
                  </button>
                </div>
              </div>

              {/* Right Column: Select users by */}
              <div className="space-y-4 border-l lg:border-gray-200 lg:pl-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Select users by</h3>
                  <div className="space-y-3">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs inline-flex items-center gap-2">
                      Browser = Chrome
                      <X size={12} className="cursor-pointer hover:text-blue-900" />
                    </span>
                    <div>
                      <button className="border border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors">
                        <Plus size={14} /> Add User Filter
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Group users by</h3>
                  <button className="border border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors">
                    <Plus size={14} /> Add User Breakdown
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chart Container matching Whatfix screenshot */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-8">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="border border-gray-300 rounded-lg p-0.5 flex bg-gray-50">
                {(['7D', '30D', '90D'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      dateRange === r ? 'bg-blue-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <Calendar size={13} />
                <span>11/03 - 31/03</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Metric</label>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="border border-gray-300 rounded-lg text-xs font-medium px-3 py-1.5 bg-white text-gray-800 outline-none"
                >
                  <option value="Unique Users">Unique Users</option>
                  <option value="Total Events">Total Events</option>
                  <option value="Completion Rate">Completion Rate</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Chart Type</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="border border-gray-300 rounded-lg text-xs font-medium px-3 py-1.5 bg-white text-gray-800 outline-none"
                >
                  <option value="Pie Chart">Pie Chart</option>
                  <option value="Line Chart">Line Chart</option>
                  <option value="Bar Chart">Bar Chart</option>
                </select>
              </div>
            </div>
          </div>

          {/* Donut Chart Display */}
          <div className="flex flex-col items-center justify-center space-y-8 py-4">
            <div className="relative w-64 h-64 rounded-full flex items-center justify-center shadow-inner" style={{
              background: 'conic-gradient(#6366f1 0% 35%, #eab308 35% 54%, #f97316 54% 69%, #a855f7 69% 82%, #3b82f6 82% 91%, #14b8a6 91% 97%, #f43f5e 97% 100%)'
            }}>
              {/* Inner cutout for Donut */}
              <div className="w-36 h-36 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">413.9K</span>
              </div>
            </div>

            {/* Labeled Color Legend matching screenshot */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 max-w-4xl text-xs font-medium text-gray-700">
              {rows.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table Section matching Whatfix screenshot */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input 
                type="checkbox" 
                checked={selectedAll}
                onChange={(e) => {
                  setSelectedAll(e.target.checked);
                  setRows(rows.map(r => ({ ...r, checked: e.target.checked })));
                }}
                className="w-4 h-4 rounded text-blue-600" 
              />
              <span>Selected {rows.filter(r => r.checked).length} of {rows.length} Events</span>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportData}
                className="border border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download size={14} /> Export data
              </button>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-800 outline-none w-48 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
                <tr>
                  <th className="p-3.5 w-10 text-center"></th>
                  <th className="p-3.5">
                    <div className="flex items-center gap-1 cursor-pointer">
                      <span>Event</span>
                      <span className="text-gray-400">⇕</span>
                    </div>
                  </th>
                  <th className="p-3.5">
                    <div className="flex items-center gap-1 cursor-pointer">
                      <span>Flow origin</span>
                      <span className="text-gray-400">⇕</span>
                    </div>
                  </th>
                  <th className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 cursor-pointer">
                      <span>Unique Users</span>
                      <span className="text-gray-400">⇕</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows
                  .filter(r => !searchQuery || r.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={() => toggleRowCheck(idx)}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                      </td>
                      <td className="p-3.5 font-medium text-gray-900">Flow Stat</td>
                      <td className="p-3.5 font-medium text-gray-700">{row.label.replace('Flow Start / ', '').replace('Flow Start/ ', '')}</td>
                      <td className="p-3.5 text-right font-bold text-gray-900">{row.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 bg-white outline-none"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>Entries</span>
            </div>

            <div className="flex items-center gap-4">
              <span>Showing 1 of {rows.length} out of {rows.length} entries</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 border border-gray-300 rounded hover:bg-white disabled:opacity-50" disabled>
                  <ChevronLeft size={14} />
                </button>
                <button className="px-3 py-1 bg-blue-600 text-white font-semibold rounded">1</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-white">2</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-white">3</button>
                <span className="px-1 text-gray-400">...</span>
                <button className="p-1.5 border border-gray-300 rounded hover:bg-white">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
