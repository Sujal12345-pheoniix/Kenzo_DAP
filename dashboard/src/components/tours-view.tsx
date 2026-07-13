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
}

export default function ToursView({
  flows,
  editingFlow,
  setEditingFlow,
  handleDeleteFlow,
  handleUpdateFlowStatus,
  handleSaveFlowDetails
}: ToursViewProps) {

  // AI Suggestions box when empty
  const aiSuggestions = [
    { title: "Standard User Onboarding Flow", steps: 4, desc: "Guide new signups through the main analytics layout." },
    { title: "Snippet Installation Wizard", steps: 3, desc: "Step-by-step guidance for setting up the JS tracker snippet." },
    { title: "CRM Workspace Walkthrough", steps: 5, desc: "Demonstrate pipeline management, leads, and dashboards." }
  ];

  return (
    <div className="space-y-6 select-none relative">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-outfit text-white leading-tight">Walkthrough Tours</h2>
          <p className="text-zinc-400 text-xs mt-1">Deploy, monitor, and configure active user onboarding flows.</p>
        </div>
        
        <a 
          href="/sandbox.html?kenzo_builder=true" 
          target="_blank" 
          rel="noreferrer" 
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all duration-300 shadow-lg shadow-indigo-600/20 group active:scale-95 cursor-pointer"
        >
          <span>Create Tour Visually</span>
          <Sparkles size={13} className="text-indigo-200 group-hover:animate-pulse" />
        </a>
      </div>

      {/* Empty State */}
      {flows.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass border border-zinc-800/80 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[380px] custom-shadow">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 ring-8 ring-zinc-950">
              <Compass size={28} className="animate-spin-slow text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-white font-outfit">No Walkthroughs Configured</h3>
            <p className="text-zinc-500 text-xs mt-2 max-w-sm leading-relaxed">
              Launch the Sandbox Builder to visually select HTML elements, capture click events, and create step-by-step guides.
            </p>
            <a 
              href="/sandbox.html?kenzo_builder=true" 
              target="_blank"
              className="mt-6 flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all hover:bg-zinc-800 cursor-pointer shadow"
            >
              <span>Launch Visual Sandbox Builder</span>
              <ArrowRight size={13} />
            </a>
          </div>

          {/* AI Suggestions Sidebar */}
          <div className="glass border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between custom-shadow">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-indigo-400" />
                <h4 className="text-xs font-bold tracking-wider text-zinc-300 uppercase">AI Recommendations</h4>
              </div>
              <div className="space-y-3">
                {aiSuggestions.map((sug, idx) => (
                  <div key={idx} className="p-3 bg-zinc-900/40 border border-zinc-850 hover:border-zinc-800 rounded-lg flex flex-col gap-1 transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">{sug.title}</span>
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-300 font-semibold px-1.5 py-0.5 rounded-full">{sug.steps} steps</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">{sug.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-900 text-[10px] text-zinc-500 flex items-center gap-1.5 leading-relaxed">
              <AlertCircle size={12} className="text-indigo-400 shrink-0" />
              <span>Select any template inside the builder to generate immediately.</span>
            </div>
          </div>
        </div>
      ) : (
        /* Tours Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {flows.map((flow) => {
            const pattern = flow.urlRules?.[0]?.pattern || 'Any Route (/)';
            const isPublished = flow.status === 'published';

            return (
              <motion.div 
                key={flow.id}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="glass border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between custom-shadow group glow-border"
              >
                <div>
                  {/* Card Title & Badges */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-semibold text-zinc-400 font-mono">ID: {flow.id.substring(0, 8)}...</span>
                      <h3 className="text-base font-bold text-zinc-100 font-outfit truncate">{flow.name}</h3>
                    </div>
                    
                    {/* Status badge */}
                    {isPublished ? (
                      <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/25 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Published</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/50 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                        <span>Draft Mode</span>
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed min-h-[36px] line-clamp-2">
                    {flow.description || 'No description provided. Click edit to details.'}
                  </p>

                  {/* Meta Specs */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-900/60 text-[10px]">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Globe size={12} className="text-indigo-400" />
                      <span className="truncate" title={pattern}>{pattern}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Layers size={12} className="text-indigo-400" />
                      <span>{flow.stepCount || 0} steps configured</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Tag size={12} className="text-indigo-400" />
                      <span>Priority Weight: {flow.priority}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Calendar size={12} className="text-indigo-400" />
                      <span>Ver: v{flow.version}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-zinc-900/60">
                  <div className="flex items-center gap-2">
                    {/* Visual Preview */}
                    <a 
                      href={`/sandbox.html?kenzo_flow=${flow.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-lg text-zinc-400 flex items-center gap-1 text-[10px] transition-colors cursor-pointer"
                      title="Test Visual Onboarding Flow"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </a>
                  </div>

                  {/* Edit operations */}
                  <div className="flex items-center gap-1.5">
                    {/* Status toggle */}
                    {isPublished ? (
                      <button 
                        onClick={() => handleUpdateFlowStatus(flow, 'draft')}
                        className="text-[10px] bg-zinc-900 border border-zinc-850 hover:border-zinc-800 hover:text-white px-2.5 py-1.5 rounded-lg text-zinc-400 transition-all cursor-pointer font-semibold"
                      >
                        Draft
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateFlowStatus(flow, 'published')}
                        className="text-[10px] bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white px-2.5 py-1.5 rounded-lg text-indigo-300 transition-all cursor-pointer font-semibold"
                      >
                        Publish
                      </button>
                    )}

                    {/* Edit button */}
                    <button 
                      onClick={() => setEditingFlow(flow)}
                      className="p-1.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 hover:text-white rounded-lg text-zinc-400 transition-colors cursor-pointer"
                      title="Edit Configuration"
                    >
                      <Edit size={12} />
                    </button>

                    {/* Delete button */}
                    <button 
                      onClick={() => handleDeleteFlow(flow.id)}
                      className="p-1.5 bg-zinc-900 border border-zinc-850 hover:border-red-900/50 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-zinc-500 transition-colors cursor-pointer"
                      title="Delete Campaign"
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

      {/* Spring Animated Edit Details Dialog (Modal glassmorphism) */}
      <AnimatePresence>
        {editingFlow && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-default">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 150 }}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl custom-shadow flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-indigo-400" />
                  <h3 className="text-sm font-bold font-outfit text-white">Edit Tour Configuration</h3>
                </div>
                <button 
                  onClick={() => setEditingFlow(null)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveFlowDetails} className="p-6 overflow-y-auto space-y-5">
                {/* Name */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tour Campaign Name</label>
                  <input 
                    type="text" 
                    value={editingFlow.name}
                    onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-all"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Campaign Description</label>
                  <textarea 
                    value={editingFlow.description}
                    onChange={(e) => setEditingFlow({ ...editingFlow, description: e.target.value })}
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-all resize-none"
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
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-all"
                      min={0}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Publication Status</label>
                    <select 
                      value={editingFlow.status}
                      onChange={(e) => setEditingFlow({ ...editingFlow, status: e.target.value as any })}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none transition-all cursor-pointer"
                    >
                      <option value="draft">Draft Mode</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Target URL Pattern (Read-only representation to encourage builder edits) */}
                <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-lg text-[10px] text-left">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-semibold mb-1">
                    <Compass size={12} className="text-indigo-400" />
                    <span>Target Route Pattern</span>
                  </div>
                  <code className="text-indigo-300 text-[10px] font-mono break-all bg-zinc-900/60 px-1.5 py-0.5 rounded border border-zinc-850 block w-full mt-1.5">
                    {editingFlow.urlRules?.[0]?.pattern || 'Any route (matches globally)'}
                  </code>
                  <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed">
                    * Route patterns, trigger selectors, and step modals are configured inside the visual visual builder to prevent schema inconsistencies.
                  </p>
                </div>

                {/* Submit Action */}
                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-lg cursor-pointer transition-all shadow-md shadow-indigo-600/10 active:scale-[0.99] focus:outline-none"
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
