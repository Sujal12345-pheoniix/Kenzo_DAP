import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Edit, 
  Trash2, 
  Eye, 
  Sparkles,
  Calendar,
  Compass,
  ArrowRight,
  Globe,
  Tag,
  AlertCircle
} from 'lucide-react';

interface Flow {
  id: string;
  name: string;
  description: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  urlRules?: Array<{ type: string; pattern: string }>;
  priority: number;
  stepCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ToursViewProps {
  flows: Flow[];
  editingFlow: Flow | null;
  setEditingFlow: (flow: Flow | null) => void;
  handleDeleteFlow: (flowId: string) => void;
  handleUpdateFlowStatus: (flow: Flow, status: 'draft' | 'published') => void;
  handleSaveFlowDetails: (e: React.FormEvent) => void;
  apiKey: string;
}

export default function ToursView({
  flows,
  editingFlow,
  setEditingFlow,
  handleDeleteFlow,
  handleUpdateFlowStatus,
  handleSaveFlowDetails,
  apiKey
}: ToursViewProps) {

  const aiSuggestions = [
    { title: "Standard User Onboarding Flow", steps: 4, desc: "Guide new signups through the main analytics layout." },
    { title: "Snippet Installation Wizard", steps: 3, desc: "Step-by-step guidance for setting up the JS tracker snippet." },
    { title: "CRM Workspace Walkthrough", steps: 5, desc: "Demonstrate pipeline management, leads, and dashboards." }
  ];

  return (
    <div className="space-y-12 select-none relative text-left">
      
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-outfit text-white tracking-tight leading-tight">Walkthrough Tours</h2>
          <p className="text-zinc-500 text-xs mt-1">Deploy, monitor, and configure active user onboarding flows.</p>
        </div>
        
        <a 
          href={`/sandbox.html?kenzo_builder=true&api_key=${apiKey}`} 
          target="_blank" 
          rel="noreferrer" 
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-550 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer"
        >
          <span>Create Tour Visually</span>
          <Sparkles size={13} className="text-indigo-200 animate-pulse" />
        </a>
      </div>

      {/* Empty State */}
      {flows.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[360px] shadow-xl mt-4">
            <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
              <Compass size={28} className="text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white font-outfit">No Walkthroughs Configured</h3>
            <p className="text-zinc-500 text-xs mt-2 max-w-sm leading-relaxed">
              Launch the Sandbox Builder to visually select HTML elements, capture click events, and create step-by-step guides.
            </p>
            <a 
              href={`/sandbox.html?kenzo_builder=true&api_key=${apiKey}`} 
              target="_blank"
              className="mt-6 flex items-center gap-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow"
            >
              <span>Launch Visual Sandbox Builder</span>
              <ArrowRight size={13} />
            </a>
          </div>

          {/* AI Suggestions Sidebar (Material card style) */}
          <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-8 shadow-xl mt-4">
            {/* Floating violet Header */}
            <div className="absolute -top-5 left-4 right-4 h-11 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl flex items-center px-4 shadow-lg shadow-violet-600/20 ring-1 ring-white/10">
              <Sparkles size={14} className="text-indigo-200 mr-2" />
              <h4 className="text-[10px] font-bold tracking-wider text-white uppercase">AI Recommendations</h4>
            </div>

            <div className="space-y-3 mt-4">
              {aiSuggestions.map((sug, idx) => (
                <div key={idx} className="p-3 bg-zinc-950/40 border border-zinc-850 hover:border-zinc-800 rounded-xl flex flex-col gap-1 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-350">{sug.title}</span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-300 font-semibold px-1.5 py-0.5 rounded-full">{sug.steps} steps</span>
                  </div>
                  <p className="text-[10px] text-zinc-550 leading-normal">{sug.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-850/50 text-[9px] text-zinc-500 flex items-center gap-1.5 leading-relaxed font-semibold">
              <AlertCircle size={12} className="text-indigo-400 shrink-0" />
              <span>Select templates inside builder to generate immediately.</span>
            </div>
          </div>
        </div>
      ) : (
        /* Tours Grid of 3D Overlapping Header Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {flows.map((flow) => {
            const pattern = flow.urlRules?.[0]?.pattern || 'Any Route (/)';
            const isPublished = flow.status === 'published';

            return (
              <motion.div 
                key={flow.id}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-8 shadow-xl flex flex-col justify-between mt-6 group"
              >
                {/* Floating Card Header Banner (Purple for Published, Grey/Black for Draft) */}
                <div className={`absolute -top-5 left-4 right-4 h-12 rounded-xl flex items-center justify-between px-4 shadow-lg ring-1 ring-white/10 ${
                  isPublished 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-indigo-600/25' 
                    : 'bg-zinc-800 shadow-black/40 border border-zinc-700/40'
                }`}>
                  <span className="text-[10px] font-bold font-mono text-white">ID: {flow.id.substring(0, 8)}</span>
                  
                  {isPublished ? (
                    <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>Live</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-zinc-900/50 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <span>Draft</span>
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-bold text-zinc-100 font-outfit truncate">{flow.name}</h3>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed min-h-[36px] line-clamp-2">
                    {flow.description || 'No description provided. Click the edit configuration button to add details.'}
                  </p>

                  {/* Metadata spec pills */}
                  <div className="grid grid-cols-2 gap-2.5 mt-5 pt-3 border-t border-zinc-850/50 text-[10px]">
                    <div className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                      <Globe size={11} className="text-indigo-400" />
                      <span className="truncate" title={pattern}>{pattern}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                      <Layers size={11} className="text-indigo-400" />
                      <span>{flow.stepCount || 0} steps</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                      <Tag size={11} className="text-indigo-400" />
                      <span>Priority: {flow.priority}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                      <Calendar size={11} className="text-indigo-400" />
                      <span>Version: v{flow.version}</span>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-zinc-850/50">
                  <a 
                    href={`/sandbox.html?kenzo_flow=${flow.id}&api_key=${apiKey}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-lg text-zinc-400 flex items-center gap-1 text-[10px] transition-colors cursor-pointer font-bold"
                  >
                    <Eye size={12} />
                    <span>Preview</span>
                  </a>

                  <div className="flex items-center gap-2">
                    {isPublished ? (
                      <button 
                        onClick={() => handleUpdateFlowStatus(flow, 'draft')}
                        className="text-[10px] bg-zinc-950 border border-zinc-800 hover:border-zinc-750 hover:text-white px-2.5 py-1.5 rounded-lg text-zinc-400 transition-all cursor-pointer font-bold"
                      >
                        Draft
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateFlowStatus(flow, 'published')}
                        className="text-[10px] bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-650 hover:text-white px-2.5 py-1.5 rounded-lg text-indigo-300 transition-all cursor-pointer font-bold"
                      >
                        Publish
                      </button>
                    )}

                    <button 
                      onClick={() => setEditingFlow(flow)}
                      className="p-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-lg text-zinc-400 transition-colors cursor-pointer"
                    >
                      <Edit size={12} />
                    </button>

                    <button 
                      onClick={() => handleDeleteFlow(flow.id)}
                      className="p-1.5 bg-zinc-950 border border-zinc-800 hover:border-red-900/40 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-zinc-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Spring Animated edit details dialog (Material form style modal) */}
      <AnimatePresence>
        {editingFlow && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-default">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 150 }}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl relative mt-4 max-h-[90vh] flex flex-col"
            >
              {/* Floating Header Banner */}
              <div className="h-14 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-between px-6 shadow-md shadow-indigo-600/25 ring-1 ring-white/10">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-white" />
                  <h3 className="text-sm font-bold font-outfit text-white uppercase tracking-wider">Edit Tour Configuration</h3>
                </div>
                <button 
                  onClick={() => setEditingFlow(null)}
                  className="text-xs bg-black/20 hover:bg-black/30 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold"
                >
                  Cancel
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveFlowDetails} className="p-6 overflow-y-auto space-y-5">
                {/* Name */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tour Name</label>
                  <input 
                    type="text" 
                    value={editingFlow.name}
                    onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Description</label>
                  <textarea 
                    value={editingFlow.description}
                    onChange={(e) => setEditingFlow({ ...editingFlow, description: e.target.value })}
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all resize-none"
                    placeholder="Describe what onboarding flow accomplishes..."
                  />
                </div>

                {/* Priority Weight & Status */}
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Priority Weight</label>
                    <input 
                      type="number" 
                      value={editingFlow.priority}
                      onChange={(e) => setEditingFlow({ ...editingFlow, priority: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all"
                      min={0}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</label>
                    <select 
                      value={editingFlow.status}
                      onChange={(e) => setEditingFlow({ ...editingFlow, status: e.target.value as any })}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-none transition-all cursor-pointer font-semibold"
                    >
                      <option value="draft">Draft Mode</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Target URL Pattern */}
                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl text-[10px] text-left">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-semibold mb-1">
                    <Compass size={11} className="text-indigo-400" />
                    <span>Target Route Pattern</span>
                  </div>
                  <code className="text-indigo-300 text-[10px] font-mono break-all bg-zinc-900 px-2 py-1 rounded border border-zinc-850 block w-full mt-1.5">
                    {editingFlow.urlRules?.[0]?.pattern || 'Any route (matches globally)'}
                  </code>
                  <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed font-semibold">
                    * Route patterns, trigger selectors, and step modals are configured inside the visual builder.
                  </p>
                </div>

                {/* Submit Action */}
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-550 text-white text-xs font-bold py-3 rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/10 active:scale-[0.99] focus:outline-none"
                >
                  Save Walkthrough Settings
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
