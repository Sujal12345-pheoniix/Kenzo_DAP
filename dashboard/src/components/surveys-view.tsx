import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Plus, Edit, Trash2, X, Save, AlertCircle, CheckCircle,
  Loader2, Star, Users, MessageSquare, Hash
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
    nps: { icon: <Hash size={13} />, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30', label: 'NPS Score (0-10)' },
    rating: { icon: <Star size={13} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'Star Rating' },
    multiple_choice: { icon: <CheckCircle size={13} />, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', label: 'Multiple Choice' },
    text: { icon: <MessageSquare size={13} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Free Text' },
  };

  return (
    <div className="space-y-6 select-none relative text-left w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Surveys</h2>
            <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2.5 py-0.5 rounded-md border border-slate-800">
              {surveys.length} configured
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Feedback collection and NPS tracking</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            onClick={openCreate} 
            className="kenzo-btn-primary text-xs"
          >
            <Plus size={14} />
            <span>New Survey</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#0c1322] border border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-800 bg-[#080e1a] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-28">Status</th>
                <th className="py-3 px-4">Survey Name & Question</th>
                <th className="py-3 px-4 w-44">Target Route</th>
                <th className="py-3 px-4 w-36">Format</th>
                <th className="py-3 px-4 w-28 text-center">Responses</th>
                <th className="py-3 px-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/60">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-4 bg-slate-800/60 rounded w-3/4" />
                    </td>
                  </tr>
                ))
              ) : surveys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                        <BarChart2 size={20} />
                      </div>
                      <h4 className="text-xs font-semibold text-white">No Surveys Configured</h4>
                      <p className="text-xs text-slate-400">Launch in-app micro-surveys to collect real-time user sentiment.</p>
                      <button onClick={openCreate} className="kenzo-btn-primary text-xs mt-2">
                        <Plus size={13} />
                        <span>Create First Survey</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                surveys.map(survey => {
                  const tc = typeConfig[survey.survey_type] ?? { icon: <BarChart2 size={12} />, color: 'text-slate-300 bg-slate-800/60 border-slate-700', label: survey.survey_type };
                  const routePat = survey.url_rules && survey.url_rules[0]?.pattern ? survey.url_rules[0].pattern : '*';
                  const isLive = survey.status === 'published';

                  return (
                    <tr key={survey.id} className="hover:bg-[#0f192c] transition-colors group">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          isLive 
                            ? 'bg-emerald-500/10 text-emerald-400 border-slate-800' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          <span>{isLive ? 'Live' : 'Draft'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-white text-xs group-hover:text-sky-300 transition-colors">
                            {survey.name}
                          </span>
                          <span className="text-[11px] text-slate-400 line-clamp-1">
                            "{survey.question}"
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-[#080e1a] border border-slate-800 text-slate-300 font-mono text-[11px] px-2 py-0.5 rounded">
                          {routePat}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-medium capitalize ${tc.color}`}>
                          {tc.icon}
                          <span>{tc.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-300 text-xs">
                        <span className="inline-flex items-center gap-1 bg-[#080e1a] border border-slate-800 px-2 py-0.5 rounded font-mono text-[11px]">
                          <Users size={11} className="text-sky-400" />
                          <span>{survey.response_count ?? 0}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button onClick={() => openEdit(survey)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer" title="Edit Survey">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(survey)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer" title="Delete Survey">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Panel */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40" onClick={closePanel} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#070d18] border-l border-slate-800 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0C1322]">
                <div>
                  <h3 className="text-base font-bold font-syne text-white">{editing ? 'Edit Survey' : 'New Survey'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configure survey trigger and feedback questions</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Survey Name <span className="text-sky-400">*</span></label>
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Post-Feature Adoption NPS" className="w-full bg-[#0C1322] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                </div>

                {/* Target Route / Page URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Route / Page URL <span className="text-sky-400">*</span></label>
                  <div className="space-y-2">
                    <select
                      value={COMMON_ROUTES.some(r => r.pattern === targetRoutePattern) ? targetRoutePattern : 'custom'}
                      onChange={e => {
                        if (e.target.value !== 'custom') {
                          setTargetRoutePattern(e.target.value);
                        }
                      }}
                      className="w-full bg-[#0C1322] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                    >
                      {COMMON_ROUTES.map(r => (
                        <option key={r.pattern} value={r.pattern} className="bg-[#0C1322] text-white">{r.label}</option>
                      ))}
                      <option value="custom" className="bg-[#0C1322] text-white">Custom URL Pattern...</option>
                    </select>
                    <input
                      type="text"
                      value={targetRoutePattern}
                      onChange={e => setTargetRoutePattern(e.target.value)}
                      placeholder="e.g. /dashboard or /dashboard/crm"
                      className="w-full bg-[#070d18] border border-slate-800 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs font-mono text-sky-300 placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Question <span className="text-sky-400">*</span></label>
                  <textarea value={form.question ?? ''} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="How easy was it to perform this action today?" rows={3} className="w-full bg-[#0C1322] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Survey Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SURVEY_TYPES.map(t => {
                      const tc = typeConfig[t];
                      return (
                        <button key={t} onClick={() => setForm(f => ({ ...f, survey_type: t }))} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${form.survey_type === t ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0C1322] text-slate-400 hover:border-slate-700'}`}>
                          {tc?.icon}{tc?.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.survey_type === 'multiple_choice' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Answer Options</label>
                    <div className="space-y-2 mb-2">
                      {(form.options ?? []).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-[#070d18] rounded-xl border border-slate-800">
                          <div className="w-3 h-3 rounded-full border border-slate-600 flex-shrink-0" />
                          <span className="text-xs text-slate-300 flex-1">{opt.label}</span>
                          <button onClick={() => removeOption(idx)} className="text-slate-500 hover:text-red-400 transition-colors"><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={optionInput} onChange={e => setOptionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOption()} placeholder="Add option and press Enter..." className="flex-1 bg-[#0C1322] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                      <button onClick={addOption} className="px-3.5 py-2 kenzo-glow-btn text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"><Plus size={14} /></button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['draft', 'published'] as const).map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} className={`py-2.5 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${form.status === s ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0C1322] text-slate-400 hover:border-slate-700'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-[#0C1322] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl kenzo-glow-btn text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0C1322] border border-slate-800 rounded-lg p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center"><AlertCircle size={20} className="text-red-400" /></div>
                <div><h4 className="font-bold font-syne text-white">Delete Survey</h4><p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p></div>
              </div>
              <p className="text-xs text-slate-300 mb-5 leading-relaxed">Are you sure you want to delete <span className="font-semibold text-white">"{deleteTarget.name}"</span>?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border pointer-events-auto backdrop-blur-md ${toast.type === 'success' ? 'bg-[#0C1322]/95 border-emerald-500/40 text-emerald-300' : 'bg-[#0C1322]/95 border-red-500/40 text-red-300'}`}>
              {toast.type === 'success' ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-red-400" />}
              <span className="text-xs font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
