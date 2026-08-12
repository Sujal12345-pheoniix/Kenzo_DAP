import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Plus, Edit, Trash2, X, Save, ChevronDown,
  AlertCircle, CheckCircle, Loader2, Monitor, Clock, MousePointerClick, ToggleLeft, ToggleRight
} from 'lucide-react';

interface Popup {
  id: string;
  name: string;
  title: string;
  content: string;
  popup_type: 'modal' | 'banner' | 'tooltip';
  position: 'center' | 'top' | 'bottom-right';
  trigger_event: 'page_load' | 'exit_intent' | 'click';
  trigger_delay: number;
  theme: 'light' | 'dark';
  show_close_button: boolean;
  status?: 'draft' | 'published';
  createdAt?: string;
}

interface GuidanceModuleProps {
  projectId: string;
  headers: Record<string, string>;
}

interface Toast { id: string; type: 'success' | 'error'; message: string; }

const POPUP_TYPES = ['modal', 'banner', 'tooltip'] as const;
const POSITIONS = ['center', 'top', 'bottom-right'] as const;
const TRIGGER_EVENTS = ['page_load', 'exit_intent', 'click'] as const;

const emptyForm = (): Partial<Popup> => ({
  name: '', title: '', content: '',
  popup_type: 'modal', position: 'center',
  trigger_event: 'page_load', trigger_delay: 0,
  theme: 'dark', show_close_button: true, status: 'draft',
});

function StatusBadge({ status }: { status?: string }) {
  const cfg = {
    published: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Published' },
    draft: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Draft' },
  }[status ?? 'draft'] ?? { dot: 'bg-zinc-500', text: 'text-zinc-400', label: status };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
    </span>
  );
}

function TypeIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    modal: <Monitor size={14} />,
    banner: <Layers size={14} />,
    tooltip: <MousePointerClick size={14} />,
  };
  return icons[type] ?? <Layers size={14} />;
}

export default function PopupsView({ projectId, headers }: GuidanceModuleProps) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Popup | null>(null);
  const [form, setForm] = useState<Partial<Popup>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Popup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const authHeaders = useCallback(() => ({
    ...headers, 'Content-Type': 'application/json', 'x-project-id': projectId,
  }), [headers, projectId]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchPopups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/popups', { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPopups(Array.isArray(data) ? data : data.popups ?? []);
    } catch { addToast('error', 'Failed to load popups'); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchPopups(); }, [fetchPopups]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setPanelOpen(true); };
  const openEdit = (p: Popup) => { setEditing(p); setForm({ ...p }); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setEditing(null); setForm(emptyForm()); };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.title?.trim()) {
      addToast('error', 'Name and title are required'); return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/v1/admin/popups/${editing.id}` : '/api/v1/admin/popups';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editing) { setPopups(prev => prev.map(p => p.id === saved.id ? saved : p)); addToast('success', 'Popup updated'); }
      else { setPopups(prev => [saved, ...prev]); addToast('success', 'Popup created'); }
      closePanel();
    } catch { addToast('error', 'Failed to save popup'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/popups/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setPopups(prev => prev.filter(p => p.id !== deleteTarget.id));
      addToast('success', 'Popup deleted'); setDeleteTarget(null);
    } catch { addToast('error', 'Failed to delete popup'); }
    finally { setDeleting(false); }
  };

  const typeColors: Record<string, string> = {
    modal: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    banner: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    tooltip: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Layers size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Popups</h2>
            <p className="text-xs text-zinc-500">Modals, banners and tooltip overlays</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all">
          <Plus size={16} /> New Popup
        </button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-[#1e2238] rounded w-2/3" />
              <div className="h-3 bg-[#1e2238] rounded w-full" />
              <div className="h-3 bg-[#1e2238] rounded w-4/5" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-16 bg-[#1e2238] rounded-full" />
                <div className="h-6 w-16 bg-[#1e2238] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : popups.length === 0 ? (
        <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-20 text-center">
          <Layers size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 font-medium mb-4">No popups configured</p>
          <button onClick={openCreate} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all">
            Create your first popup
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popups.map(popup => (
            <motion.div
              key={popup.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-5 group hover:border-[#2a2f4c] transition-all"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-semibold text-white text-sm truncate">{popup.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{popup.title}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(popup)} className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-zinc-400 hover:text-indigo-400 transition-colors">
                    <Edit size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(popup)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Content Preview */}
              {popup.content && (
                <p className="text-xs text-zinc-500 line-clamp-2 mb-4 leading-relaxed">{popup.content}</p>
              )}

              {/* Preview Box */}
              <div className={`rounded-xl border p-3 mb-4 ${popup.theme === 'dark' ? 'bg-[#0d0f17] border-[#2a2f4c]' : 'bg-zinc-100 border-zinc-300'}`}>
                <div className="flex items-center gap-2">
                  <div className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${typeColors[popup.popup_type] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                    <TypeIcon type={popup.popup_type} />
                    <span className="capitalize">{popup.popup_type}</span>
                  </div>
                  <span className={`text-xs ${popup.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>{popup.position}</span>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-zinc-600">
                    <Clock size={11} />
                    {popup.trigger_delay}s delay
                  </span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-xs text-zinc-600 capitalize">{popup.trigger_event.replace('_', ' ')}</span>
                </div>
                <StatusBadge status={popup.status} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Slide-out Panel */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closePanel} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#11131f] border-l border-[#1e2238] z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2238]">
                <div>
                  <h3 className="text-base font-bold text-white">{editing ? 'Edit Popup' : 'New Popup'}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Configure popup settings and behavior</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-lg hover:bg-[#181b2e] text-zinc-400 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Popup Name <span className="text-red-400">*</span></label>
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Modal" className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Display Title <span className="text-red-400">*</span></label>
                  <input type="text" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Welcome to the Dashboard!" className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Content</label>
                  <textarea value={form.content ?? ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Enter popup body text..." rows={4} className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors resize-none" />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Popup Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {POPUP_TYPES.map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, popup_type: t }))} className={`py-2 rounded-xl border text-xs font-medium capitalize transition-all flex items-center justify-center gap-1.5 ${form.popup_type === t ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}>
                        <TypeIcon type={t} />{t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map(p => (
                      <button key={p} onClick={() => setForm(f => ({ ...f, position: p }))} className={`py-2 rounded-xl border text-xs font-medium capitalize transition-all ${form.position === p ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trigger */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Trigger Event</label>
                    <div className="relative">
                      <select value={form.trigger_event ?? 'page_load'} onChange={e => setForm(f => ({ ...f, trigger_event: e.target.value as any }))} className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 appearance-none">
                        {TRIGGER_EVENTS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Delay (seconds)</label>
                    <input type="number" min={0} value={form.trigger_delay ?? 0} onChange={e => setForm(f => ({ ...f, trigger_delay: parseInt(e.target.value) || 0 }))} className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
                  </div>
                </div>

                {/* Theme & Close Button */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['dark', 'light'] as const).map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, theme: t }))} className={`py-2 rounded-xl border text-xs font-medium capitalize transition-all ${form.theme === t ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Show Close Button</label>
                    <button onClick={() => setForm(f => ({ ...f, show_close_button: !f.show_close_button }))} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all w-full ${form.show_close_button ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400'}`}>
                      {form.show_close_button ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {form.show_close_button ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                {/* Status */}
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
                  {saving ? 'Saving...' : 'Save Popup'}
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
                <div><h4 className="font-bold text-white">Delete Popup</h4><p className="text-xs text-zinc-500 mt-0.5">This action cannot be undone</p></div>
              </div>
              <p className="text-sm text-zinc-400 mb-5">Delete <span className="font-semibold text-white">"{deleteTarget.name}"</span>?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-[#2a2f4c] text-sm font-semibold text-zinc-400 hover:bg-[#181b2e] transition-colors">Cancel</button>
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
