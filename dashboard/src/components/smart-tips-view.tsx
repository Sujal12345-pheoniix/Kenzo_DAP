import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb, Plus, Edit, Trash2, X, Save, ChevronDown,
  AlertCircle, CheckCircle, Eye, EyeOff, Loader2
} from 'lucide-react';

interface SmartTip {
  id: string;
  name: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  trigger: 'hover' | 'click';
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

const emptyForm = (): Partial<SmartTip> => ({
  name: '',
  content: '',
  position: 'top',
  trigger: 'hover',
  status: 'draft',
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

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1e2238]">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#1e2238] rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
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
    setPanelOpen(true);
  };

  const openEdit = (tip: SmartTip) => {
    setEditing(tip);
    setForm({ ...tip });
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
      const method = editing ? 'PUT' : 'POST';
      const url = editing
        ? `/api/v1/admin/smart-tips/${editing.id}`
        : '/api/v1/admin/smart-tips';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editing) {
        setTips(prev => prev.map(t => t.id === saved.id ? saved : t));
        addToast('success', 'Smart tip updated');
      } else {
        setTips(prev => [saved, ...prev]);
        addToast('success', 'Smart tip created');
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

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Lightbulb size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Smart Tips</h2>
            <p className="text-xs text-zinc-500">Contextual tooltips and inline guidance</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={16} /> New Smart Tip
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e2238]">
              {['Name', 'Content Preview', 'Position', 'Trigger', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
            ) : tips.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Lightbulb size={40} className="text-zinc-700" />
                    <p className="text-zinc-500 font-medium">No smart tips yet</p>
                    <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all">
                      Create your first tip
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              tips.map(tip => (
                <tr key={tip.id} className="border-b border-[#1e2238] hover:bg-[#181b2e] transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{tip.name}</td>
                  <td className="px-4 py-3 text-zinc-400 max-w-xs">
                    <span className="line-clamp-1">{tip.content}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#181b2e] border border-[#2a2f4c] text-xs text-zinc-300 capitalize">
                      {tip.position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#181b2e] border border-[#2a2f4c] text-xs text-zinc-300 capitalize">
                      {tip.trigger}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={tip.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(tip)} className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-zinc-400 hover:text-indigo-400 transition-colors">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(tip)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out Panel */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={closePanel}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-[#11131f] border-l border-[#1e2238] z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2238]">
                <div>
                  <h3 className="text-base font-bold text-white">{editing ? 'Edit Smart Tip' : 'New Smart Tip'}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{editing ? `Editing: ${editing.name}` : 'Create a contextual guidance tip'}</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-lg hover:bg-[#181b2e] text-zinc-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Dashboard Onboarding Tip"
                    className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Content <span className="text-red-400">*</span></label>
                  <textarea
                    value={form.content ?? ''}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Enter the tip message..."
                    rows={5}
                    className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Position</label>
                  <div className="relative">
                    <select
                      value={form.position ?? 'top'}
                      onChange={e => setForm(f => ({ ...f, position: e.target.value as any }))}
                      className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 appearance-none transition-colors"
                    >
                      {POSITIONS.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Trigger</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRIGGERS.map(t => (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, trigger: t }))}
                        className={`py-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${form.trigger === t ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['draft', 'published'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`py-2.5 rounded-xl border text-sm font-medium capitalize transition-all flex items-center justify-center gap-2 ${form.status === s ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}
                      >
                        {s === 'published' ? <Eye size={14} /> : <EyeOff size={14} />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1e2238] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-[#2a2f4c] text-sm font-semibold text-zinc-400 hover:bg-[#181b2e] transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Saving...' : 'Save Tip'}
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle size={20} className="text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Delete Smart Tip</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 mb-5">
                Are you sure you want to delete <span className="font-semibold text-white">"{deleteTarget.name}"</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-[#2a2f4c] text-sm font-semibold text-zinc-400 hover:bg-[#181b2e] transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
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
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl pointer-events-auto ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
            >
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="text-sm font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
