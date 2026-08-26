import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Edit,
  Trash2,
  Eye,
  Sparkles,
  Compass,
  Globe,
  AlertCircle,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  GripVertical,
  Zap,
  Monitor,
  MousePointerClick,
  Info
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

interface Step {
  id: string;
  order: number;
  title: string;
  content: string;
  selector: { type?: string; css?: string; value?: string };
  placement: string;
  displayMode: string;
  buttons: Array<{ text?: string; label?: string; action: string; style?: string; primary?: boolean }>;
}

interface ToursViewProps {
  flows: Flow[];
  editingFlow: Flow | null;
  setEditingFlow: (flow: Flow | null) => void;
  handleDeleteFlow: (flowId: string) => void;
  handleUpdateFlowStatus: (id: string, status: 'draft' | 'published' | 'archived') => void;
  handleSaveFlowDetails: (id: string, updatedData: Partial<Flow>) => void;
  apiKey: string;
}

const DISPLAY_MODES = ['tooltip', 'spotlight', 'highlight', 'modal'];
const PLACEMENTS = ['auto', 'top', 'bottom', 'left', 'right', 'top-start', 'top-end', 'bottom-start', 'bottom-end', 'center'];

function StepEditor({
  flow,
  apiKey,
  onClose,
}: {
  flow: Flow;
  apiKey: string;
  onClose: () => void;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [showNewStep, setShowNewStep] = useState(false);
  const [newStep, setNewStep] = useState({
    title: '',
    content: '',
    selector: '#my-element',
    placement: 'bottom',
    displayMode: 'tooltip',
  });

  const authHeaders = useCallback(() => {
    const authData = localStorage.getItem('kenzo_admin_auth');
    const token = authData ? JSON.parse(authData).token : apiKey;
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, [apiKey]);

  const loadSteps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/flows/${flow.id}/steps`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load steps');
      const data = await res.json();
      setSteps(data.steps || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [flow.id, authHeaders]);

  useEffect(() => { loadSteps(); }, [loadSteps]);

  const saveStep = async (step: Step) => {
    setSaving(true);
    try {
      const selectorObj = step.selector?.css
        ? { type: 'css', value: step.selector.css }
        : (step.selector?.value ? step.selector : { type: 'css', value: '#body' });

      const res = await fetch(`/api/v1/admin/steps/${step.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          title: step.title,
          content: step.content,
          selector: selectorObj,
          placement: step.placement,
          displayMode: step.displayMode,
          buttons: step.buttons,
          order: step.order,
        }),
      });
      if (!res.ok) throw new Error('Failed to save step');
      await loadSteps();
      setEditingStep(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteStep = async (stepId: string) => {
    if (!confirm('Delete this step?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/steps/${stepId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete step');
      await loadSteps();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const createStep = async () => {
    if (!newStep.title || !newStep.content || !newStep.selector) {
      setError('Title, content and CSS selector are required'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/flows/${flow.id}/steps`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newStep.title,
          content: newStep.content,
          selector: { type: 'css', value: newStep.selector },
          placement: newStep.placement,
          displayMode: newStep.displayMode,
          buttons: [
            ...(steps.length > 0 ? [{ text: 'Back', action: 'previous', style: 'secondary' }] : []),
            { text: 'Next', action: 'next', style: 'primary' }
          ],
        }),
      });
      if (!res.ok) throw new Error('Failed to create step');
      setShowNewStep(false);
      setNewStep({ title: '', content: '', selector: '#my-element', placement: 'bottom', displayMode: 'tooltip' });
      await loadSteps();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getSelectorStr = (s: Step['selector']) => {
    if (!s) return '';
    return s.css || s.value || '';
  };

  const displayModeIcon = (mode: string) => {
    switch (mode) {
      case 'modal': return <Monitor size={10} className="text-violet-400" />;
      case 'spotlight': return <Zap size={10} className="text-amber-400" />;
      case 'highlight': return <MousePointerClick size={10} className="text-emerald-400" />;
      default: return <Info size={10} className="text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 150 }}
        className="w-full max-w-2xl bg-[#0C1322] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="h-14 bg-[#080E1A] border-b border-[#1E293B] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-white" />
            <div>
              <h3 className="text-sm font-bold text-white leading-none">{flow.name}</h3>
              <p className="text-[10px] text-indigo-200 mt-0.5">{steps.length} step{steps.length !== 1 ? 's' : ''} configured</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/sandbox.html?kenzo_flow=${flow.id}&api_key=${apiKey}`}
              target="_blank" rel="noreferrer"
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center gap-1"
            >
              <Eye size={11} /> Preview
            </a>
            <button onClick={onClose} className="text-xs bg-black/20 hover:bg-black/30 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={13} /> {error}
              <button onClick={() => setError(null)} className="ml-auto hover:text-red-300"><X size={12} /></button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-xs">
              <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full mr-2" />
              Loading steps...
            </div>
          ) : steps.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">
              <Layers size={32} className="mx-auto mb-3 text-zinc-700" />
              <p className="text-xs font-medium">No steps yet</p>
              <p className="text-[10px] mt-1">Add your first step to start building this walkthrough.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {steps.sort((a, b) => a.order - b.order).map((step, idx) => (
                <div key={step.id} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                  {/* Step row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-900 transition-colors"
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-zinc-200 truncate">{step.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5 text-[9px] text-zinc-500">
                          {displayModeIcon(step.displayMode)} {step.displayMode}
                        </span>
                        <span className="text-[9px] text-zinc-600">·</span>
                        <code className="text-[9px] text-zinc-500 font-mono truncate max-w-[120px]">{getSelectorStr(step.selector)}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingStep({...step}); }}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                        className="p-1 hover:bg-red-500/10 rounded text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                      {expandedStep === step.id ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
                    </div>
                  </div>

                  {/* Expanded step details (view mode) */}
                  <AnimatePresence>
                    {expandedStep === step.id && editingStep?.id !== step.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-zinc-800"
                      >
                        <div className="px-4 py-3 space-y-2">
                          <div
                            className="text-[11px] text-zinc-400 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: step.content }}
                          />
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div className="text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">Placement</div>
                            <div className="text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">Mode</div>
                            <div className="text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">Buttons</div>
                            <div className="text-[10px] text-indigo-300 font-mono">{step.placement}</div>
                            <div className="text-[10px] text-indigo-300 font-mono">{step.displayMode}</div>
                            <div className="text-[10px] text-zinc-400">{(step.buttons || []).length} btn(s)</div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Edit form for this step */}
                    {editingStep?.id === step.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-zinc-700"
                      >
                        <div className="px-4 py-4 space-y-3 bg-zinc-900">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Title</label>
                            <input
                              value={editingStep.title}
                              onChange={e => setEditingStep({...editingStep, title: e.target.value})}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Content (HTML ok)</label>
                            <textarea
                              value={editingStep.content}
                              onChange={e => setEditingStep({...editingStep, content: e.target.value})}
                              rows={3}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors resize-none font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">CSS Selector</label>
                              <input
                                value={getSelectorStr(editingStep.selector)}
                                onChange={e => setEditingStep({...editingStep, selector: { type: 'css', value: e.target.value, css: e.target.value }})}
                                placeholder="#my-element"
                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-2 py-2 text-xs text-indigo-300 outline-none transition-colors font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Placement</label>
                              <select
                                value={editingStep.placement}
                                onChange={e => setEditingStep({...editingStep, placement: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-2 py-2 text-xs text-zinc-300 outline-none transition-colors cursor-pointer"
                              >
                                {PLACEMENTS.map(p => <option key={p}>{p}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Display Mode</label>
                              <select
                                value={editingStep.displayMode}
                                onChange={e => setEditingStep({...editingStep, displayMode: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-2 py-2 text-xs text-zinc-300 outline-none transition-colors cursor-pointer"
                              >
                                {DISPLAY_MODES.map(m => <option key={m}>{m}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => saveStep(editingStep)}
                              disabled={saving}
                              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Save size={11} /> {saving ? 'Saving...' : 'Save Step'}
                            </button>
                            <button
                              onClick={() => setEditingStep(null)}
                              className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}

          {/* New Step Form */}
          <AnimatePresence>
            {showNewStep && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-zinc-950 border border-indigo-500/30 rounded-xl p-4 space-y-3"
              >
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus size={11} /> New Step
                </h4>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Title *</label>
                  <input
                    value={newStep.title}
                    onChange={e => setNewStep({...newStep, title: e.target.value})}
                    placeholder="e.g. Click the Add Deal button"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Content (HTML ok) *</label>
                  <textarea
                    value={newStep.content}
                    onChange={e => setNewStep({...newStep, content: e.target.value})}
                    placeholder="Describe what the user should do here..."
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">CSS Selector *</label>
                    <input
                      value={newStep.selector}
                      onChange={e => setNewStep({...newStep, selector: e.target.value})}
                      placeholder="#element-id"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg px-2 py-2 text-xs text-indigo-300 outline-none transition-colors font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Placement</label>
                    <select
                      value={newStep.placement}
                      onChange={e => setNewStep({...newStep, placement: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg px-2 py-2 text-xs text-zinc-300 outline-none transition-colors cursor-pointer"
                    >
                      {PLACEMENTS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Mode</label>
                    <select
                      value={newStep.displayMode}
                      onChange={e => setNewStep({...newStep, displayMode: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg px-2 py-2 text-xs text-zinc-300 outline-none transition-colors cursor-pointer"
                    >
                      {DISPLAY_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={createStep}
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={11} /> {saving ? 'Adding...' : 'Add Step'}
                  </button>
                  <button
                    onClick={() => setShowNewStep(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 flex-shrink-0 bg-zinc-950/50">
          <button
            onClick={() => { setShowNewStep(true); setExpandedStep(null); setEditingStep(null); }}
            className="flex items-center gap-1.5 text-xs bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 hover:border-indigo-500 text-indigo-300 hover:text-white font-bold px-3 py-2 rounded-lg transition-all cursor-pointer"
          >
            <Plus size={12} /> Add Step
          </button>
          <div className="flex items-center gap-2">
            <a
              href={`/sandbox.html?kenzo_builder=true&api_key=${apiKey}`}
              target="_blank" rel="noreferrer"
              className="text-xs border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={11} /> Visual Builder
            </a>
            <button onClick={onClose} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer">
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CreateTourModal({
  apiKey,
  activeProjectId,
  onClose,
  onSuccess
}: {
  apiKey: string;
  activeProjectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('New Enterprise Walkthrough Tour');
  const [description, setDescription] = useState('Interactive guided walkthrough for feature onboarding & user adoption.');
  const [urlPattern, setUrlPattern] = useState('/dashboard');
  const [priority, setPriority] = useState(10);
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  
  // First Step details
  const [stepTitle, setStepTitle] = useState('Welcome to Kenzo OneERP 💎');
  const [stepContent, setStepContent] = useState('This interactive guide will walk you through the key features and workflows of this page.');
  const [stepSelector, setStepSelector] = useState('body');
  const [displayMode, setDisplayMode] = useState('modal');
  const [placement, setPlacement] = useState('center');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const authData = localStorage.getItem('kenzo_admin_auth');
      const token = authData ? JSON.parse(authData).token : apiKey;
      headers['Authorization'] = `Bearer ${token}`;
      if (activeProjectId) {
        headers['x-project-id'] = activeProjectId;
      }

      // 1. Create the Flow
      const flowRes = await fetch('/api/v1/admin/flows', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          description,
          urlRules: [{ type: 'contains', pattern: urlPattern }],
          priority,
          status
        })
      });

      if (!flowRes.ok) {
        throw new Error('Failed to create walkthrough tour');
      }

      const flow = await flowRes.json();

      // 2. Create Initial Step
      const selectorObj = { type: 'css', value: stepSelector };
      const stepRes = await fetch(`/api/v1/admin/flows/${flow.id}/steps`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: stepTitle,
          content: stepContent,
          selector: selectorObj,
          displayMode,
          placement,
          buttons: [
            { text: 'Start Tour', action: 'next', style: 'primary' },
            { text: 'Skip', action: 'close', style: 'secondary' }
          ]
        })
      });

      if (!stepRes.ok) {
        console.warn('Flow created, but initial step failed');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish walkthrough');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 cursor-default">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-[#0C1322] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="h-14 bg-[#080E1A] border-b border-[#1E293B] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-sky-400" />
            <h3 className="text-sm font-bold font-outfit text-white uppercase tracking-wider">Create Walkthrough</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs bg-black/20 hover:bg-black/30 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-left flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Tour Info */}
          <div className="space-y-4 bg-[#080E1A] p-4 border border-[#1E293B] rounded-lg">
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass size={12} /> 1. Tour Target & General Info
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Tour Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. CRM Sales Pipeline Tour"
                  className="kenzo-input w-full"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Target ERP Route / Path *</label>
                <input
                  type="text"
                  value={urlPattern}
                  onChange={e => setUrlPattern(e.target.value)}
                  placeholder="e.g. /dashboard/crm"
                  className="kenzo-input w-full font-mono text-sky-400"
                  required
                />
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[9px] text-zinc-500 font-bold self-center mr-1">Presets:</span>
              {[
                { label: 'All Pages (*)', val: '/' },
                { label: 'Admin Dashboard', val: '/dashboard' },
                { label: 'CRM Pipeline', val: '/dashboard/crm' },
                { label: 'HRMS Guide', val: '/dashboard/hrms' },
                { label: 'Finance Center', val: '/dashboard/finance' },
              ].map(p => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setUrlPattern(p.val)}
                  className={`text-[9px] font-semibold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                    urlPattern === p.val
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Summary of what users learn in this tour..."
                className="kenzo-input w-full resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Initial Publishing Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="kenzo-input w-full cursor-pointer"
                >
                  <option value="published">🚀 Published (LIVE on website)</option>
                  <option value="draft">📝 Draft (Internal only)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Priority Weight</label>
                <input
                  type="number"
                  value={priority}
                  onChange={e => setPriority(parseInt(e.target.value) || 1)}
                  className="kenzo-input w-full"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Initial Step Builder */}
          <div className="space-y-4 bg-[#080E1A] p-4 border border-[#1E293B] rounded-lg">
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={12} /> 2. Configure First Step / Tooltip
            </h4>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Step Title *</label>
              <input
                type="text"
                value={stepTitle}
                onChange={e => setStepTitle(e.target.value)}
                placeholder="e.g. Welcome to Kenzo OneERP 💎"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Step Content (HTML supported) *</label>
              <textarea
                value={stepContent}
                onChange={e => setStepContent(e.target.value)}
                rows={2}
                placeholder="Instructions displayed inside the popup/tooltip..."
                className="kenzo-input w-full resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Element Selector *</label>
                <input
                  type="text"
                  value={stepSelector}
                  onChange={e => setStepSelector(e.target.value)}
                  placeholder="body, aside, table, #id"
                  className="kenzo-input w-full font-mono text-sky-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Display Mode</label>
                <select
                  value={displayMode}
                  onChange={e => setDisplayMode(e.target.value)}
                  className="kenzo-input w-full cursor-pointer"
                >
                  <option value="modal">🪟 Center Modal (Popup)</option>
                  <option value="spotlight">🔦 Spotlight Cutout</option>
                  <option value="tooltip">💬 Positioned Tooltip</option>
                  <option value="highlight">✨ Pulse Highlight</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Placement</label>
                <select
                  value={placement}
                  onChange={e => setPlacement(e.target.value)}
                  className="kenzo-input w-full cursor-pointer"
                >
                  {PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full kenzo-btn-primary justify-center py-3.5 text-xs rounded-lg"
          >
            <Sparkles size={14} />
            <span>{submitting ? 'Publishing...' : 'Publish Walkthrough'}</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
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
  const [stepEditorFlow, setStepEditorFlow] = useState<Flow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');

  const activeProjectId = typeof window !== 'undefined' ? localStorage.getItem('kenzo_active_project_id') || '' : '';

  const handleAutoGenerateAI = async () => {
    setIsGeneratingAI(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;
      if (activeProjectId) headers['x-project-id'] = activeProjectId;

      const res = await fetch('/api/v1/admin/ai/auto-generate', {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Failed to generate AI walkthroughs.');
      }
    } catch {
      alert('Error generating AI walkthroughs.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Unique routes for filter dropdown
  const uniqueRoutes = Array.from(new Set(flows.map(f => f.urlRules?.[0]?.pattern || '/'))).filter(Boolean);

  const filteredFlows = flows.filter(flow => {
    const matchesSearch = flow.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (flow.description && flow.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          flow.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || flow.status === statusFilter;
    const flowRoute = flow.urlRules?.[0]?.pattern || '/';
    const matchesRoute = routeFilter === 'all' || flowRoute.includes(routeFilter);
    return matchesSearch && matchesStatus && matchesRoute;
  });

  return (
    <div className="space-y-6 select-none relative text-left w-full text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Walkthroughs</h2>
            <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2.5 py-0.5 rounded-lg border border-slate-700">
              {flows.length} configured
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Manage product walkthroughs and onboarding flows.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleAutoGenerateAI}
            disabled={isGeneratingAI}
            className="kenzo-btn-secondary text-xs disabled:opacity-50"
          >
            <Zap size={13} className={isGeneratingAI ? 'animate-spin text-amber-400' : 'text-amber-400'} />
            <span>{isGeneratingAI ? 'Generating...' : 'Auto-Generate Tours'}</span>
          </button>

          <a
            href={`/sandbox.html?kenzo_builder=true&api_key=${apiKey}`}
            target="_blank"
            rel="noreferrer"
            className="kenzo-btn-secondary text-xs"
          >
            <Sparkles size={13} className="text-sky-400" />
            <span>Visual Builder</span>
          </a>

          <button
            onClick={() => setShowCreateModal(true)}
            className="kenzo-btn-primary text-xs"
          >
            <Plus size={14} />
            <span>Create Walkthrough</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0C1322] border border-[#1E293B] p-3 rounded-lg">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search walkthroughs by title, route, or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="kenzo-input w-full pl-8 py-1.5 text-xs placeholder-slate-500"
            />
            <Compass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Route Filter */}
          <select
            value={routeFilter}
            onChange={e => setRouteFilter(e.target.value)}
            className="kenzo-input py-1.5 text-xs cursor-pointer text-slate-300"
          >
            <option value="all">All Routes</option>
            {uniqueRoutes.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center bg-[#080e1a] border border-slate-800 p-0.5 rounded-lg text-xs">
            {(['all', 'published', 'draft'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                  statusFilter === st ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Operational Data Table */}
      {filteredFlows.length === 0 ? (
        <div className="bg-[#0C1322] border border-[#1E293B] rounded-lg p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Layers size={24} />
          </div>
          <h3 className="text-sm font-semibold text-white">No Walkthrough Tours Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery || statusFilter !== 'all' || routeFilter !== 'all' 
              ? 'No tours match your filter criteria. Try clearing search filters.'
              : 'Create your first interactive step-by-step walkthrough to onboard users.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="kenzo-btn-primary text-xs mx-auto"
          >
            <Plus size={13} />
            <span>Create New Tour</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#0C1322] border border-[#1E293B] rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-800 bg-[#080e1a] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4">Tour Name & Details</th>
                  <th className="py-3 px-4 w-48">Target Route</th>
                  <th className="py-3 px-4 w-28 text-center">Steps</th>
                  <th className="py-3 px-4 w-24 text-center">Priority</th>
                  <th className="py-3 px-4 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredFlows.map(flow => {
                  const pattern = flow.urlRules?.[0]?.pattern || '/';
                  const isLive = flow.status === 'published';

                  return (
                    <tr 
                      key={flow.id} 
                      className="hover:bg-[#0F192C] transition-colors group border-b border-slate-800/60 last:border-b-0"
                    >
                      {/* Status Toggle Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleUpdateFlowStatus(flow.id, isLive ? 'draft' : 'published')}
                          className={`text-xs font-medium cursor-pointer hover:underline ${
                            isLive ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                          title={`Click to switch to ${isLive ? 'Draft' : 'Live'}`}
                        >
                          {isLive ? 'Published' : 'Draft'}
                        </button>
                      </td>

                      {/* Name & Details Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-white text-xs group-hover:text-sky-300 transition-colors">
                            {flow.name}
                          </span>
                          {flow.description && (
                            <span className="text-[11px] text-slate-400 line-clamp-1 max-w-md">
                              {flow.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Target Route Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-[#080e1a] border border-slate-800 text-slate-300 font-mono text-[11px] px-2 py-0.5 rounded">
                          <Globe size={11} className="text-slate-500" />
                          <span className="truncate max-w-[140px]" title={pattern}>{pattern}</span>
                        </span>
                      </td>

                      {/* Steps Column */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setStepEditorFlow(flow)}
                          className="inline-flex items-center gap-1 bg-[#080e1a] hover:bg-sky-500/15 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-sky-300 px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Layers size={11} className="text-sky-400" />
                          <span>{flow.stepCount || 0} steps</span>
                        </button>
                      </td>

                      {/* Priority Column */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        P{flow.priority || 1}
                      </td>

                      {/* Row Actions Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={`/sandbox.html?kenzo_flow=${flow.id}&api_key=${apiKey}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Preview in Sandbox"
                          >
                            <Eye size={13} />
                          </a>

                          <button
                            onClick={() => setStepEditorFlow(flow)}
                            className="p-1.5 rounded hover:bg-sky-500/10 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                            title="Edit Steps"
                          >
                            <GripVertical size={13} />
                          </button>

                          <button
                            onClick={() => setEditingFlow(flow)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit Tour Settings"
                          >
                            <Edit size={13} />
                          </button>

                          <button
                            onClick={() => handleDeleteFlow(flow.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Tour"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Walkthrough Tour Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTourModal
            apiKey={apiKey}
            activeProjectId={activeProjectId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Step Editor Modal */}
      <AnimatePresence>
        {stepEditorFlow && (
          <StepEditor
            flow={stepEditorFlow}
            apiKey={apiKey}
            onClose={() => setStepEditorFlow(null)}
          />
        )}
      </AnimatePresence>

      {/* Edit Flow Details Dialog */}
      <AnimatePresence>
        {editingFlow && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg bg-[#0C1322] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="h-12 border-b border-[#1E293B] flex items-center justify-between px-5 bg-[#080E1A]">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-sky-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tour Settings</h3>
                </div>
                <button
                  onClick={() => setEditingFlow(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveFlowDetails(editingFlow.id, editingFlow); }} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Tour Name</label>
                  <input
                    type="text"
                    value={editingFlow.name}
                    onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                    className="kenzo-input w-full"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Description</label>
                  <textarea
                    value={editingFlow.description}
                    onChange={(e) => setEditingFlow({ ...editingFlow, description: e.target.value })}
                    rows={2}
                    className="kenzo-input w-full resize-none"
                    placeholder="Describe what onboarding flow accomplishes..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Priority (Weight)</label>
                    <input
                      type="number"
                      value={editingFlow.priority}
                      onChange={(e) => setEditingFlow({ ...editingFlow, priority: parseInt(e.target.value) || 1 })}
                      className="kenzo-input w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Status</label>
                    <select
                      value={editingFlow.status}
                      onChange={(e) => setEditingFlow({ ...editingFlow, status: e.target.value as any })}
                      className="kenzo-input w-full cursor-pointer"
                    >
                      <option value="published">Published (Live)</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Target ERP Route Pattern</label>
                  <input
                    type="text"
                    value={editingFlow.urlRules?.[0]?.pattern || '/'}
                    onChange={(e) => setEditingFlow({
                      ...editingFlow,
                      urlRules: [{ type: 'contains', pattern: e.target.value }]
                    })}
                    className="kenzo-input w-full font-mono text-sky-300"
                    placeholder="e.g. /dashboard/crm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingFlow(null)}
                    className="kenzo-btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="kenzo-btn-primary text-xs"
                  >
                    <Save size={13} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
