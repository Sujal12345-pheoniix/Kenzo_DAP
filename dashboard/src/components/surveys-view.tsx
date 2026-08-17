import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Plus, Edit, Trash2, X, Save, AlertCircle, CheckCircle,
  Loader2, Star, Users, ChevronRight, MessageSquare, Hash
} from 'lucide-react';

interface SurveyOption {
  label: string;
  value: string;
}

interface Survey {
  id: string;
  name: string;
  question: string;
  survey_type: 'nps' | 'rating' | 'multiple_choice' | 'text';
  options?: SurveyOption[];
  url_rules?: Array<{ type: string; pattern: string }>;
  status: 'draft' | 'published' | 'archived';
  response_count?: number;
  createdAt?: string;
}

interface GuidanceModuleProps {
  projectId: string;
  headers: Record<string, string>;
}

interface Toast { id: string; type: 'success' | 'error'; message: string; }

const SURVEY_TYPES = ['nps', 'rating', 'multiple_choice', 'text'] as const;

const COMMON_ROUTES = [
  { label: 'All Pages (*)', pattern: '*' },
  { label: 'Dashboard Overview (/dashboard)', pattern: '/dashboard' },
  { label: 'CRM & Pipeline (/dashboard/crm)', pattern: '/dashboard/crm' },
  { label: 'HRMS & Employees (/dashboard/hrms)', pattern: '/dashboard/hrms' },
  { label: 'Projects & Tasks (/dashboard/projects)', pattern: '/dashboard/projects' },
  { label: 'Finance & Ledger (/dashboard/finance)', pattern: '/dashboard/finance' },
];

const emptyForm = (): Partial<Survey> => ({
  name: '',
  question: '',
  survey_type: 'nps',
  options: [],
  url_rules: [{ type: 'contains', pattern: '/dashboard' }],
  status: 'published',
});

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    published: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Published' },
    draft: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Draft' },
    archived: { dot: 'bg-zinc-500', text: 'text-zinc-400', label: 'Archived' },
  }[status] ?? { dot: 'bg-zinc-500', text: 'text-zinc-400', label: status };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
    </span>
  );
}

function SurveyTypePreview({ type }: { type: string }) {
  if (type === 'nps') {
    return (
      <div className="flex gap-1 flex-wrap mt-2">
        {[...Array(11)].map((_, i) => (
          <span key={i} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#2a2f4c] text-xs text-zinc-400 bg-[#0d0f17]">{i}</span>
        ))}
      </div>
    );
  }
  if (type === 'rating') {
    return (
      <div className="flex gap-1 mt-2">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={20} className="text-yellow-400 fill-yellow-400/30" />
        ))}
      </div>
    );
  }
  if (type === 'text') {
    return <div className="mt-2 bg-[#0d0f17] border border-[#2a2f4c] rounded-lg px-3 py-2 text-xs text-zinc-600 italic">Free text response...</div>;
  }
  return null;
}

export default function SurveysView({ projectId, headers }: GuidanceModuleProps) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Survey | null>(null);
  const [form, setForm] = useState<Partial<Survey>>(emptyForm());
  const [targetRoutePattern, setTargetRoutePattern] = useState<string>('/dashboard');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [optionInput, setOptionInput] = useState('');

  const authHeaders = useCallback(() => ({
    ...headers, 'Content-Type': 'application/json', 'x-project-id': projectId,
  }), [headers, projectId]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/surveys', { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSurveys(Array.isArray(data) ? data : data.surveys ?? []);
    } catch { addToast('error', 'Failed to load surveys'); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setTargetRoutePattern('/dashboard');
    setPanelOpen(true);
  };
  const openEdit = (s: Survey) => {
    setEditing(s);
    setForm({ ...s, options: s.options ? [...s.options] : [] });
    const pat = s.url_rules && s.url_rules[0]?.pattern ? s.url_rules[0].pattern : '/dashboard';
    setTargetRoutePattern(pat);
    setPanelOpen(true);
  };
  const closePanel = () => { setPanelOpen(false); setEditing(null); setForm(emptyForm()); setOptionInput(''); };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setForm(f => ({ ...f, options: [...(f.options ?? []), { label: optionInput.trim(), value: optionInput.trim().toLowerCase().replace(/\s+/g, '_') }] }));
    setOptionInput('');
  };

  const removeOption = (idx: number) => setForm(f => ({ ...f, options: (f.options ?? []).filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.name?.trim() || !form.question?.trim()) {
      addToast('error', 'Name and question are required'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        url_rules: [{ type: 'contains', pattern: targetRoutePattern || '*' }],
        status: form.status || 'published',
      };
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/v1/admin/surveys/${editing.id}` : '/api/v1/admin/surveys';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editing) { setSurveys(prev => prev.map(s => s.id === saved.id ? saved : s)); addToast('success', 'Survey updated'); }
      else { setSurveys(prev => [saved, ...prev]); addToast('success', 'Survey created & published'); }
      closePanel();
    } catch { addToast('error', 'Failed to save survey'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/surveys/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setSurveys(prev => prev.filter(s => s.id !== deleteTarget.id));
      addToast('success', 'Survey deleted'); setDeleteTarget(null);
    } catch { addToast('error', 'Failed to delete survey'); }
    finally { setDeleting(false); }
  };

  const typeConfig: Record<string, { icon: JSX.Element; color: string; label: string }> = {
    nps: { icon: <Hash size={13} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'NPS (0-10)' },
    rating: { icon: <Star size={13} />, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', label: 'Star Rating' },
    multiple_choice: { icon: <CheckCircle size={13} />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', label: 'Multiple Choice' },
    text: { icon: <MessageSquare size={13} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Free Text' },
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BarChart2 size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Surveys</h2>
            <p className="text-xs text-zinc-500">NPS, ratings and feedback collection</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all">
          <Plus size={16} /> New Survey
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-[#1e2238] rounded w-2/3" />
              <div className="h-3 bg-[#1e2238] rounded w-full" />
              <div className="flex gap-2"><div className="h-6 w-24 bg-[#1e2238] rounded-full" /><div className="h-6 w-20 bg-[#1e2238] rounded-full" /></div>
            </div>
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-20 text-center">
          <BarChart2 size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 font-medium mb-4">No surveys created</p>
          <button onClick={openCreate} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all">Create your first survey</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {surveys.map(survey => {
            const tc = typeConfig[survey.survey_type];
            return (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-5 hover:border-[#2a2f4c] transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${tc?.color}`}>
                        {tc?.icon}{tc?.label}
                      </span>
                      <StatusBadge status={survey.status} />
                    </div>
                    <h3 className="font-semibold text-white text-sm">{survey.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(survey)} className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-zinc-400 hover:text-indigo-400 transition-colors"><Edit size={13} /></button>
                    <button onClick={() => setDeleteTarget(survey)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>

                <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{survey.question}</p>

                <SurveyTypePreview type={survey.survey_type} />

                {survey.survey_type === 'multiple_choice' && survey.options && survey.options.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {survey.options.slice(0, 3).map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0f17] rounded-lg border border-[#2a2f4c]">
                        <div className="w-3 h-3 rounded-full border border-[#2a2f4c]" />
                        <span className="text-xs text-zinc-400">{opt.label}</span>
                      </div>
                    ))}
                    {survey.options.length > 3 && <p className="text-xs text-zinc-600 pl-3">+{survey.options.length - 3} more options</p>}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1e2238]">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users size={12} />
                    <span>{survey.response_count ?? 0} responses</span>
                  </div>
                  <button onClick={() => setSelectedSurvey(survey)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    View Responses <ChevronRight size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Responses panel */}
      <AnimatePresence>
        {selectedSurvey && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSelectedSurvey(null)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-[#11131f] border-l border-[#1e2238] z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2238]">
                <div>
                  <h3 className="text-base font-bold text-white">Response Summary</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{selectedSurvey.name}</p>
                </div>
                <button onClick={() => setSelectedSurvey(null)} className="p-2 rounded-lg hover:bg-[#181b2e] text-zinc-400 hover:text-white transition-colors"><X size={18} /></button>
              </div>
              <div className="flex-1 p-6">
                <div className="bg-[#181b2e] border border-[#2a2f4c] rounded-2xl p-5 text-center mb-4">
                  <p className="text-3xl font-bold text-white">{selectedSurvey.response_count ?? 0}</p>
                  <p className="text-xs text-zinc-500 mt-1">Total Responses</p>
                </div>
                <div className="bg-[#181b2e] border border-[#2a2f4c] rounded-2xl p-5">
                  <p className="text-xs font-semibold text-zinc-400 mb-3">Survey Question</p>
                  <p className="text-sm text-white">{selectedSurvey.question}</p>
                  <div className="mt-4">
                    <SurveyTypePreview type={selectedSurvey.survey_type} />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Slide-out Panel */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closePanel} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-[#11131f] border-l border-[#1e2238] z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2238]">
                <div>
                  <h3 className="text-base font-bold text-white">{editing ? 'Edit Survey' : 'New Survey'}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Configure survey type and questions</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-lg hover:bg-[#181b2e] text-zinc-400 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Survey Name <span className="text-red-400">*</span></label>
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Post-Onboarding NPS" className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                </div>

                {/* Target Route / Page URL */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Target Route / Page URL <span className="text-red-400">*</span></label>
                  <div className="space-y-2">
                    <select
                      value={COMMON_ROUTES.some(r => r.pattern === targetRoutePattern) ? targetRoutePattern : 'custom'}
                      onChange={e => {
                        if (e.target.value !== 'custom') {
                          setTargetRoutePattern(e.target.value);
                        }
                      }}
                      className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                    >
                      {COMMON_ROUTES.map(r => (
                        <option key={r.pattern} value={r.pattern}>{r.label}</option>
                      ))}
                      <option value="custom">Custom URL Pattern...</option>
                    </select>
                    <input
                      type="text"
                      value={targetRoutePattern}
                      onChange={e => setTargetRoutePattern(e.target.value)}
                      placeholder="e.g. /dashboard or /dashboard/crm"
                      className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 placeholder-zinc-600 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Question <span className="text-red-400">*</span></label>
                  <textarea value={form.question ?? ''} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="How likely are you to recommend us..." rows={3} className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Survey Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SURVEY_TYPES.map(t => {
                      const tc = typeConfig[t];
                      return (
                        <button key={t} onClick={() => setForm(f => ({ ...f, survey_type: t }))} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${form.survey_type === t ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}>
                          {tc?.icon}{tc?.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.survey_type === 'multiple_choice' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Answer Options</label>
                    <div className="space-y-2 mb-2">
                      {(form.options ?? []).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-[#0d0f17] rounded-lg border border-[#2a2f4c]">
                          <div className="w-3 h-3 rounded-full border border-[#2a2f4c] flex-shrink-0" />
                          <span className="text-sm text-zinc-300 flex-1">{opt.label}</span>
                          <button onClick={() => removeOption(idx)} className="text-zinc-600 hover:text-red-400 transition-colors"><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={optionInput} onChange={e => setOptionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOption()} placeholder="Add option and press Enter..." className="flex-1 bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                      <button onClick={addOption} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors"><Plus size={14} /></button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['draft', 'published'] as const).map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} className={`py-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${form.status === s ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1e2238] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-[#2a2f4c] text-sm font-semibold text-zinc-400 hover:bg-[#181b2e] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Saving...' : 'Save Survey'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><AlertCircle size={20} className="text-red-400" /></div>
                <div><h4 className="font-bold text-white">Delete Survey</h4><p className="text-xs text-zinc-500">This action cannot be undone</p></div>
              </div>
              <p className="text-sm text-zinc-400 mb-5">Delete <span className="font-semibold text-white">"{deleteTarget.name}"</span>?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-[#2a2f4c] text-sm font-semibold text-zinc-400 hover:bg-[#181b2e] transition-colors">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div key={toast.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl pointer-events-auto ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="text-sm font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
