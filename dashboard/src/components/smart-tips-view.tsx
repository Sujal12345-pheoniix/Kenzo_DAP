import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb, Plus, Edit, Trash2, X, Save, ChevronDown,
  AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Filter
} from 'lucide-react';

interface SmartTip {
  id: string;
  name: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  trigger: 'hover' | 'click';
  trigger_event?: string;
  selector?: { type?: string; value?: string } | string;
  url_rules?: Array<{ type: string; pattern: string }>;
  status: 'draft' | 'published';
  createdAt?: string;
  updatedAt?: string;
}

interface GuidanceModuleProps {
  projectId: string;
  headers: Record<string, string>;
}

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

const POSITIONS = ['top', 'bottom', 'left', 'right'] as const;
const TRIGGERS = ['hover', 'click'] as const;

const COMMON_ROUTES = [
  { label: 'All Pages (*)', pattern: '*' },
  { label: 'Dashboard Overview (/dashboard)', pattern: '/dashboard' },
  { label: 'CRM & Pipeline (/dashboard/crm)', pattern: '/dashboard/crm' },
  { label: 'HRMS & Employees (/dashboard/hrms)', pattern: '/dashboard/hrms' },
  { label: 'Projects & Tasks (/dashboard/projects)', pattern: '/dashboard/projects' },
  { label: 'Finance & Ledger (/dashboard/finance)', pattern: '/dashboard/finance' },
  { label: 'Employee Security (/dashboard/employees)', pattern: '/dashboard/employees' },
];

const emptyForm = (): Partial<SmartTip> => ({
  name: '',
  content: '',
  position: 'top',
  trigger: 'hover',
  status: 'published',
  selector: { type: 'css', value: 'button, .grid, table, body' },
  url_rules: [{ type: 'contains', pattern: '/dashboard' }],
});

function StatusBadge({ status }: { status: string }) {
  const isPub = status === 'published';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      isPub 
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isPub ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
      <span>{isPub ? 'Published' : 'Draft'}</span>
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-800/80">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-slate-800/60 rounded-lg animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function SmartTipsView({ projectId, headers }: GuidanceModuleProps) {
  const [tips, setTips] = useState<SmartTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<SmartTip | null>(null);
  const [form, setForm] = useState<Partial<SmartTip>>(emptyForm());
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');
  const [targetRoutePattern, setTargetRoutePattern] = useState<string>('/dashboard');
  const [targetCssSelector, setTargetCssSelector] = useState<string>('button, .grid, table, body');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SmartTip | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const authHeaders = useCallback(() => ({
    ...headers,
    'Content-Type': 'application/json',
    'x-project-id': projectId,
  }), [headers, projectId]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchTips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/smart-tips', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load smart tips');
      const data = await res.json();
      setTips(Array.isArray(data) ? data : data.tips ?? []);
    } catch {
      addToast('error', 'Failed to load smart tips');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchTips(); }, [fetchTips]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setTargetRoutePattern('/dashboard');
    setTargetCssSelector('button, .grid, table, body');
    setPanelOpen(true);
  };

  const openEdit = (tip: SmartTip) => {
    setEditing(tip);
    setForm({ ...tip });
    const pat = tip.url_rules && tip.url_rules[0]?.pattern ? tip.url_rules[0].pattern : '/dashboard';
    setTargetRoutePattern(pat);
    const sel = typeof tip.selector === 'string' ? tip.selector : (tip.selector?.value || 'button, .grid, table, body');
    setTargetCssSelector(sel);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.content?.trim()) {
      addToast('error', 'Name and content are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        trigger_event: form.trigger || 'hover',
        url_rules: [{ type: 'contains', pattern: targetRoutePattern || '*' }],
        selector: { type: 'css', value: targetCssSelector || 'body' },
        status: form.status || 'published',
      };
      const method = editing ? 'PUT' : 'POST';
      const url = editing
        ? `/api/v1/admin/smart-tips/${editing.id}`
        : '/api/v1/admin/smart-tips';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editing) {
        setTips(prev => prev.map(t => t.id === saved.id ? saved : t));
        addToast('success', 'Smart tip updated successfully');
      } else {
        setTips(prev => [saved, ...prev]);
        addToast('success', 'Smart tip created & published');
      }
      closePanel();
    } catch {
      addToast('error', 'Failed to save smart tip');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/smart-tips/${deleteTarget.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      setTips(prev => prev.filter(t => t.id !== deleteTarget.id));
      addToast('success', 'Smart tip deleted');
      setDeleteTarget(null);
    } catch {
      addToast('error', 'Failed to delete smart tip');
    } finally {
      setDeleting(false);
    }
  };

  const filteredTips = tips.filter(tip => {
    if (selectedRouteFilter === 'all') return true;
    const pat = tip.url_rules && tip.url_rules[0]?.pattern ? tip.url_rules[0].pattern : '';
    return pat.includes(selectedRouteFilter) || pat === '*' || pat === '/';
  });

  return (
    <div className="space-y-6 select-none text-left w-full flex-1 flex flex-col">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Lightbulb size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne text-white tracking-tight">Smart Tips & Contextual Guidance</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage inline field hints, tooltips, and interactive walkthrough anchors</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b1324] border border-slate-800 text-xs text-slate-400 font-medium">
            <span>Total Tips:</span>
            <span className="font-bold text-sky-400">{tips.length}</span>
          </div>
          <button
            onClick={openCreate}
            className="kenzo-glow-btn text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>New Smart Tip</span>
          </button>
        </div>
      </div>

      {/* Route Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1.5 shrink-0">
          <Filter size={13} className="text-sky-400" />
          Filter Route:
        </span>
        {[
          { id: 'all', label: 'All Routes' },
          { id: '/dashboard', label: 'Overview (/dashboard)' },
          { id: 'crm', label: 'CRM (/crm)' },
          { id: 'hrms', label: 'HRMS (/hrms)' },
          { id: 'projects', label: 'Projects (/projects)' },
          { id: 'finance', label: 'Finance (/finance)' },
        ].map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRouteFilter(r.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedRouteFilter === r.id 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/10' 
                : 'bg-[#0b1324] border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="kenzo-glass-card rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 bg-[#070d18]/60">
                {['Name', 'Target Route', 'Target Element', 'Content Preview', 'Position', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider font-syne">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : filteredTips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-20 text-center">
                    <div className="flex flex-col items-center gap-3.5 max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                        <Lightbulb size={28} className="animate-pulse" />
                      </div>
                      <h4 className="text-base font-bold font-syne text-white">No Smart Tips Found</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">There are no tips configured for this route. Add one to guide your application users seamlessly.</p>
                      <button onClick={openCreate} className="kenzo-glow-btn text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer mt-2">
                        Create Smart Tip
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTips.map(tip => {
                  const routePat = tip.url_rules && tip.url_rules[0]?.pattern ? tip.url_rules[0].pattern : '*';
                  const selVal = typeof tip.selector === 'string' ? tip.selector : (tip.selector?.value || 'body');
                  return (
                    <tr key={tip.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-5 py-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-400/80"></span>
                          <span>{tip.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs font-mono text-sky-300">
                          {routePat}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-400 max-w-[150px] truncate" title={selVal}>
                        {selVal}
                      </td>
                      <td className="px-5 py-4 text-slate-300 max-w-xs text-xs">
                        <span className="line-clamp-1">{tip.content}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 capitalize font-medium">
                          {tip.position}
                        </span>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={tip.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(tip)} className="p-2 rounded-xl hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer" title="Edit Tip">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => setDeleteTarget(tip)} className="p-2 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer" title="Delete Tip">
                            <Trash2 size={14} />
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
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
              onClick={closePanel}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-[#070d18] border-l border-slate-800 z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b1324]">
                <div>
                  <h3 className="text-base font-bold font-syne text-white">{editing ? 'Edit Smart Tip' : 'New Smart Tip'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{editing ? `Editing: ${editing.name}` : 'Create a contextual guidance tip'}</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tip Name <span className="text-sky-400">*</span></label>
                  <input
                    type="text"
                    value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Dashboard Navigation Tip"
                    className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
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
                      className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                    >
                      {COMMON_ROUTES.map(r => (
                        <option key={r.pattern} value={r.pattern} className="bg-[#0b1324] text-white">{r.label}</option>
                      ))}
                      <option value="custom" className="bg-[#0b1324] text-white">Custom URL Pattern...</option>
                    </select>
                    <input
                      type="text"
                      value={targetRoutePattern}
                      onChange={e => setTargetRoutePattern(e.target.value)}
                      placeholder="e.g. /dashboard/crm or /settings"
                      className="w-full bg-[#070d18] border border-slate-800 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs font-mono text-sky-300 placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Target Element Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Element CSS Selector</label>
                  <input
                    type="text"
                    value={targetCssSelector}
                    onChange={e => setTargetCssSelector(e.target.value)}
                    placeholder="e.g. button.btn-primary, #add-deal, .grid"
                    className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-500 outline-none transition-colors"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['button', '.btn-primary', 'table', '.grid', 'body'].map(quickSel => (
                      <button
                        key={quickSel}
                        type="button"
                        onClick={() => setTargetCssSelector(quickSel)}
                        className="px-2.5 py-1 rounded-lg bg-[#0b1324] border border-slate-700/60 text-[10px] font-mono text-slate-400 hover:text-sky-300 hover:border-sky-500/50 cursor-pointer transition-colors"
                      >
                        {quickSel}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tip Content <span className="text-sky-400">*</span></label>
                  <textarea
                    value={form.content ?? ''}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Enter the guidance message shown to users..."
                    rows={4}
                    className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Position</label>
                  <div className="relative">
                    <select
                      value={form.position ?? 'top'}
                      onChange={e => setForm(f => ({ ...f, position: e.target.value as any }))}
                      className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none appearance-none transition-colors"
                    >
                      {POSITIONS.map(p => <option key={p} value={p} className="bg-[#0b1324] text-white capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Trigger</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRIGGERS.map(t => (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, trigger: t }))}
                        className={`py-2.5 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${
                          form.trigger === t 
                            ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' 
                            : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['draft', 'published'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`py-2.5 rounded-xl border text-xs font-medium capitalize transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          form.status === s 
                            ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' 
                            : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {s === 'published' ? <Eye size={13} /> : <EyeOff size={13} />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-[#0b1324] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl kenzo-glow-btn text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Saving...' : 'Save Smart Tip'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1324] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <AlertCircle size={20} className="text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold font-syne text-white">Delete Smart Tip</h4>
                  <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-white">"{deleteTarget.name}"</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">
                  Cancel
                </button>
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
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl pointer-events-auto backdrop-blur-md ${
                toast.type === 'success' 
                  ? 'bg-[#0b1324]/95 border-emerald-500/40 text-emerald-300' 
                  : 'bg-[#0b1324]/95 border-red-500/40 text-red-300'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-red-400" />}
              <span className="text-xs font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
