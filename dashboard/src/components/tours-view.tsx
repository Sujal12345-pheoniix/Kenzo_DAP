import { useState, useEffect, useCallback } from 'react';
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
  handleUpdateFlowStatus: (flow: Flow, status: 'draft' | 'published') => void;
  handleSaveFlowDetails: (e: React.FormEvent) => void;
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 150 }}
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="h-14 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-between px-6 flex-shrink-0">
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-default">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="h-14 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-between px-6 shadow-md shadow-indigo-600/25 ring-1 ring-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-white animate-pulse" />
            <h3 className="text-sm font-bold font-outfit text-white uppercase tracking-wider">Create & Publish Walkthrough Tour</h3>
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
          <div className="space-y-4 bg-zinc-950/60 p-4 border border-zinc-800/80 rounded-xl">
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
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
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
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono outline-none"
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
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Initial Publishing Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
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
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Initial Step Builder */}
          <div className="space-y-4 bg-zinc-950/60 p-4 border border-zinc-800/80 rounded-xl">
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
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
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
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Display Mode</label>
                <select
                  value={displayMode}
                  onChange={e => setDisplayMode(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
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
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
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
            className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-650 hover:from-violet-500 hover:to-indigo-550 text-white text-xs font-bold py-3.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles size={14} />
            <span>{submitting ? 'Publishing Walkthrough Live...' : '🚀 Publish Walkthrough Live'}</span>
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

  const activeProjectId = typeof window !== 'undefined' ? localStorage.getItem('kenzo_active_project_id') || '' : '';

  const aiSuggestions = [
    { title: "Standard User Onboarding Flow", steps: 4, desc: "Guide new signups through the main analytics layout." },
    { title: "Snippet Installation Wizard", steps: 3, desc: "Step-by-step guidance for setting up the JS tracker snippet." },
    { title: "CRM Workspace Walkthrough", steps: 5, desc: "Demonstrate pipeline management, leads, and dashboards." }
  ];

  return (
    <div className="space-y-12 select-none relative text-left">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-outfit text-white tracking-tight leading-tight">Walkthrough Tours</h2>
          <p className="text-zinc-500 text-xs mt-1">Deploy, monitor, and configure active user onboarding flows.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-550 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Walkthrough Tour</span>
          </button>

          <a
            href={`/sandbox.html?kenzo_builder=true&api_key=${apiKey}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles size={13} className="text-indigo-400" />
            <span>Open Visual Builder</span>
          </a>
        </div>
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

          <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-8 shadow-xl mt-4">
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
                {/* Flow Card Header Banner */}
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
                    <span className="text-[9px] font-bold bg-zinc-900/50 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Draft</span>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-bold text-zinc-100 font-outfit truncate">{flow.name}</h3>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed min-h-[36px] line-clamp-2">
                    {flow.description || 'No description provided. Click edit to add details.'}
                  </p>

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

                    {/* Edit Steps button */}
                    <button
                      onClick={() => setStepEditorFlow(flow)}
                      className="p-1.5 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 hover:border-indigo-500 rounded-lg text-indigo-400 hover:text-white transition-colors cursor-pointer"
                      title="Edit Steps"
                    >
                      <GripVertical size={12} />
                    </button>

                    <button
                      onClick={() => setEditingFlow(flow)}
                      className="p-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-lg text-zinc-400 transition-colors cursor-pointer"
                      title="Edit Flow Settings"
                    >
                      <Edit size={12} />
                    </button>

                    <button
                      onClick={() => handleDeleteFlow(flow.id)}
                      className="p-1.5 bg-zinc-950 border border-zinc-800 hover:border-red-900/40 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-zinc-500 transition-colors cursor-pointer"
                      title="Delete Flow"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-default">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 150 }}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl relative mt-4 max-h-[90vh] flex flex-col"
            >
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

              <form onSubmit={handleSaveFlowDetails} className="p-6 overflow-y-auto space-y-5">
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
                      <option value="published">Published (LIVE)</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl text-[10px] text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                    <Compass size={11} className="text-indigo-400" />
                    <span>Target ERP Route Pattern</span>
                  </div>
                  <input
                    type="text"
                    value={editingFlow.urlRules?.[0]?.pattern || '/'}
                    onChange={(e) => setEditingFlow({
                      ...editingFlow,
                      urlRules: [{ type: 'contains', pattern: e.target.value }]
                    })}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono outline-none"
                    placeholder="e.g. /dashboard/crm"
                  />
                  <p className="text-[9px] text-zinc-500 leading-relaxed font-semibold">
                    * Set route pattern to target specific ERP sub-paths (e.g. <code>/dashboard/crm</code>) or <code>/</code> for global.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-550 text-white text-xs font-bold py-3 rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/10 active:scale-[0.99] focus:outline-none"
                >
                  🚀 Save & Push Changes Live
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
