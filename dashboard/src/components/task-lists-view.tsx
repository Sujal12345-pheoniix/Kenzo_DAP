import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Plus, Edit, Trash2, X, Save, AlertCircle, CheckCircle,
  Loader2, ChevronUp, ChevronDown, GripVertical, Target
} from 'lucide-react';

interface TaskItem {
  id?: string;
  title: string;
  description: string;
  completion_trigger: string;
  order?: number;
}

interface TaskList {
  id: string;
  name: string;
  title: string;
  items: TaskItem[];
  completed_count?: number;
  url_rules?: Array<{ type: string; pattern: string }>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GuidanceModuleProps {
  projectId: string;
  headers: Record<string, string>;
}

interface Toast { id: string; type: 'success' | 'error'; message: string; }

const COMMON_ROUTES = [
  { label: 'All Pages (*)', pattern: '*' },
  { label: 'Dashboard Overview (/dashboard)', pattern: '/dashboard' },
  { label: 'CRM & Pipeline (/dashboard/crm)', pattern: '/dashboard/crm' },
  { label: 'HRMS & Employees (/dashboard/hrms)', pattern: '/dashboard/hrms' },
  { label: 'Projects & Tasks (/dashboard/projects)', pattern: '/dashboard/projects' },
  { label: 'Finance & Ledger (/dashboard/finance)', pattern: '/dashboard/finance' },
];

const emptyItem = (): TaskItem => ({ title: '', description: '', completion_trigger: '' });
const emptyForm = (): Partial<TaskList> => ({
  name: '',
  title: '',
  items: [emptyItem()],
  url_rules: [{ type: 'contains', pattern: '/dashboard' }],
  status: 'published',
});

function CompletionBar({ total, label }: { total: number; label: string }) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-xs font-semibold text-indigo-400">{total} task{total !== 1 ? 's' : ''}</span>
      </div>
      <div className="h-1.5 bg-[#0d0f17] rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" style={{ width: `${Math.min(100, (total / 10) * 100)}%` }} />
      </div>
    </div>
  );
}

export default function TaskListsView({ projectId, headers }: GuidanceModuleProps) {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<TaskList | null>(null);
  const [form, setForm] = useState<Partial<TaskList>>(emptyForm());
  const [targetRoutePattern, setTargetRoutePattern] = useState<string>('/dashboard');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskList | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const authHeaders = useCallback(() => ({
    ...headers, 'Content-Type': 'application/json', 'x-project-id': projectId,
  }), [headers, projectId]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/task-lists', { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLists(Array.isArray(data) ? data : data.taskLists ?? []);
    } catch { addToast('error', 'Failed to load task lists'); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setTargetRoutePattern('/dashboard');
    setPanelOpen(true);
  };
  const openEdit = (l: TaskList) => {
    setEditing(l);
    setForm({ ...l, items: l.items ? [...l.items] : [emptyItem()] });
    const pat = l.url_rules && l.url_rules[0]?.pattern ? l.url_rules[0].pattern : '/dashboard';
    setTargetRoutePattern(pat);
    setPanelOpen(true);
  };
  const closePanel = () => { setPanelOpen(false); setEditing(null); setForm(emptyForm()); };

  const addItem = () => setForm(f => ({ ...f, items: [...(f.items ?? []), emptyItem()] }));

  const removeItem = (idx: number) => setForm(f => ({
    ...f, items: (f.items ?? []).filter((_, i) => i !== idx)
  }));

  const updateItem = (idx: number, field: keyof TaskItem, value: string) =>
    setForm(f => ({
      ...f,
      items: (f.items ?? []).map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }));

  const moveItem = (idx: number, dir: 'up' | 'down') => {
    setForm(f => {
      const items = [...(f.items ?? [])];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= items.length) return f;
      [items[idx], items[swap]] = [items[swap], items[idx]];
      return { ...f, items };
    });
  };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.title?.trim()) {
      addToast('error', 'Name and title are required'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        url_rules: [{ type: 'contains', pattern: targetRoutePattern || '*' }],
        status: form.status || 'published',
      };
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/v1/admin/task-lists/${editing.id}` : '/api/v1/admin/task-lists';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editing) { setLists(prev => prev.map(l => l.id === saved.id ? saved : l)); addToast('success', 'Task list updated'); }
      else { setLists(prev => [saved, ...prev]); addToast('success', 'Task list created & published'); }
      closePanel();
    } catch { addToast('error', 'Failed to save task list'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/task-lists/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setLists(prev => prev.filter(l => l.id !== deleteTarget.id));
      addToast('success', 'Task list deleted'); setDeleteTarget(null);
    } catch { addToast('error', 'Failed to delete task list'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-8 select-none relative text-left w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <CheckSquare size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne text-white tracking-tight">Onboarding Checklists & Task Lists</h2>
            <p className="text-xs text-slate-400 mt-0.5">Interactive guided progress checklists and feature adoption workflows</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b1324] border border-slate-800 text-xs text-slate-400 font-medium">
            <span>Total Checklists:</span>
            <span className="font-bold text-sky-400">{lists.length}</span>
          </div>
          <button 
            onClick={openCreate} 
            className="kenzo-glow-btn text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>New Task List</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="kenzo-glass-card rounded-2xl p-6 animate-pulse space-y-3">
              <div className="h-4 bg-slate-800 rounded w-1/3" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
              <div className="h-2 bg-slate-800 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="kenzo-glass-card rounded-3xl p-16 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 mx-auto mb-4">
            <CheckSquare size={32} className="animate-pulse" />
          </div>
          <h3 className="text-base font-bold font-syne text-white">No Task Lists Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Create an onboarding checklist to guide new users through critical milestones.
          </p>
          <button onClick={openCreate} className="kenzo-glow-btn px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
            Create First Checklist
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map(list => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="kenzo-glass-card rounded-3xl overflow-hidden hover:border-sky-500/40 transition-all shadow-xl"
            >
              <div
                className="flex items-center justify-between px-6 py-5 cursor-pointer"
                onClick={() => setExpandedId(prev => prev === list.id ? null : list.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    <Target size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-white text-sm font-syne truncate">{list.title}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-300">
                        {list.url_rules?.[0]?.pattern || '*'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{list.name}</p>
                    <CompletionBar total={list.items?.length ?? 0} label="Milestones" />
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button onClick={e => { e.stopPropagation(); openEdit(list); }} className="p-2 rounded-xl hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">
                    <Edit size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteTarget(list); }} className="p-2 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                  <div className="p-2 text-slate-400">
                    {expandedId === list.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {expandedId === list.id && (
                <div className="border-t border-slate-800/80 px-6 py-4 bg-[#070d18]/60 space-y-2.5">
                  {(list.items ?? []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-[#0b1324] border border-slate-800 rounded-2xl">
                      <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200">{item.title}</p>
                        {item.description && <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>}
                      </div>
                      {item.completion_trigger && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[#070d18] border border-slate-800 text-sky-300">
                          {item.completion_trigger}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Slide-out Panel */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40" onClick={closePanel} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#070d18] border-l border-slate-800 z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b1324]">
                <div>
                  <h3 className="text-base font-bold font-syne text-white">{editing ? 'Edit Task List' : 'New Task List'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configure onboarding steps and completion triggers</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Internal Name <span className="text-sky-400">*</span></label>
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. core-onboarding-checklist" className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                </div>

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
                      placeholder="e.g. /dashboard or /dashboard/projects"
                      className="w-full bg-[#070d18] border border-slate-800 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs font-mono text-sky-300 placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Display Title <span className="text-sky-400">*</span></label>
                  <input type="text" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Get Started with Kenzo Platform" className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                </div>

                {/* Tasks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-slate-300">Task Items ({form.items?.length ?? 0})</label>
                    <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors font-semibold cursor-pointer">
                      <Plus size={13} /> Add Task
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(form.items ?? []).map((item, idx) => (
                      <div key={idx} className="bg-[#0b1324] border border-slate-800 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center gap-2 mb-2">
                          <GripVertical size={14} className="text-slate-500" />
                          <span className="text-xs font-bold text-sky-400 font-syne">Milestone {idx + 1}</span>
                          <div className="flex gap-1 ml-auto">
                            <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"><ChevronUp size={13} /></button>
                            <button onClick={() => moveItem(idx, 'down')} disabled={idx === (form.items?.length ?? 0) - 1} className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"><ChevronDown size={13} /></button>
                            <button onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"><X size={13} /></button>
                          </div>
                        </div>
                        <input type="text" value={item.title} onChange={e => updateItem(idx, 'title', e.target.value)} placeholder="Task title..." className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                        <input type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description (optional)..." className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                        <input type="text" value={item.completion_trigger} onChange={e => updateItem(idx, 'completion_trigger', e.target.value)} placeholder="Completion trigger (e.g. button.clicked)..." className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3 py-2 text-xs font-mono text-sky-300 placeholder-slate-500 outline-none transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-[#0b1324] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl kenzo-glow-btn text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Saving...' : 'Save Task List'}
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0b1324] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center"><AlertCircle size={20} className="text-red-400" /></div>
                <div><h4 className="font-bold font-syne text-white">Delete Task List</h4><p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p></div>
              </div>
              <p className="text-xs text-slate-300 mb-5 leading-relaxed">Are you sure you want to delete <span className="font-semibold text-white">"{deleteTarget.title}"</span>?</p>
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
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl pointer-events-auto backdrop-blur-md ${toast.type === 'success' ? 'bg-[#0b1324]/95 border-emerald-500/40 text-emerald-300' : 'bg-[#0b1324]/95 border-red-500/40 text-red-300'}`}>
              {toast.type === 'success' ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-red-400" />}
              <span className="text-xs font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
