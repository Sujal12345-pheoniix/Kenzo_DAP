import { GitBranch, ArrowDownRight } from 'lucide-react';

export default function FunnelsView() {

  const STAGES = [
    { step: 1, name: 'Page Visit (/dashboard)', users: 12450, dropoff: 0, conversion: 100 },
    { step: 2, name: 'Triggered Tour Step 1', users: 10830, dropoff: 13, conversion: 87 },
    { step: 3, name: 'Interacted with Feature Tag', users: 8940, dropoff: 17.5, conversion: 71.8 },
    { step: 4, name: 'Completed Full Milestone', users: 7920, dropoff: 11.4, conversion: 63.6 },
  ];

  return (
    <div className="space-y-6 select-none text-left w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Funnels</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Conversion paths and drop-off analysis</p>
        </div>
      </div>

      {/* Funnel Pipeline Visualizer */}
      <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <GitBranch size={13} className="text-sky-400" />
            <span>Product Adoption Funnel Pipeline</span>
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Timeframe:</span>
            <span className="font-semibold text-white bg-[#080e1a] border border-slate-800 px-2 py-0.5 rounded">Last 30 Days</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGES.map(stage => (
            <div key={stage.step} className="bg-[#080e1a] border border-slate-800 p-4 rounded-lg space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {stage.step}
                </span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  {stage.conversion}%
                </span>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white truncate">{stage.name}</h4>
                <div className="text-lg font-bold text-slate-200 mt-1">{stage.users.toLocaleString()} users</div>
              </div>
              {stage.dropoff > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-rose-400 font-medium">
                  <ArrowDownRight size={11} />
                  <span>-{stage.dropoff}% drop-off</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
