import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Plus, Edit, Trash2, X, Save, AlertCircle, CheckCircle,
  Loader2, ToggleLeft, ToggleRight, ExternalLink, Zap
} from 'lucide-react';

interface Beacon {
  id: string;
  name: string;
  label: string;
  description: string;
  color: string;
  size: 'small' | 'medium' | 'large';
  pulse_animation: boolean;
  on_click_action: 'show_tooltip' | 'open_flow' | 'external_link';
  createdAt?: string;
}

interface GuidanceModuleProps {
  projectId: string;
  headers: Record<string, string>;
}

interface Toast { id: string; type: 'success' | 'error'; message: string; }

const SIZES = ['small', 'medium', 'large'] as const;
const CLICK_ACTIONS = ['show_tooltip', 'open_flow', 'external_link'] as const;
const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4'];

const sizeMap = { small: 'w-3 h-3', medium: 'w-4 h-4', large: 'w-5 h-5' };

const emptyForm = (): Partial<Beacon> => ({
  name: '', label: '', description: '',
  color: '#6366f1', size: 'medium',
  pulse_animation: true, on_click_action: 'show_tooltip',
});

function PulsingDot({ color, size, pulse }: { color: string; size: string; pulse: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 24, height: 24 }}>
      {pulse && (
        <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: color }} />
      )}
      <div className={`rounded-full ${sizeMap[size as keyof typeof sizeMap] ?? 'w-4 h-4'}`} style={{ backgroundColor: color }} />
    </div>
  );
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'external_link') return <ExternalLink size={13} />;
  if (action === 'open_flow') return <Zap size={13} />;
  return <Radio size={13} />;
}

export default function BeaconsView({ projectId, headers }: GuidanceModuleProps) {
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Beacon | null>(null);
  const [form, setForm] = useState<Partial<Beacon>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Beacon | null>(null);
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

  const fetchBeacons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/beacons', { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBeacons(Array.isArray(data) ? data : data.beacons ?? []);
    } catch { addToast('error', 'Failed to load beacons'); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchBeacons(); }, [fetchBeacons]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setPanelOpen(true); };
  const openEdit = (b: Beacon) => { setEditing(b); setForm({ ...b }); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setEditing(null); setForm(emptyForm()); };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.label?.trim()) {
      addToast('error', 'Name and label are required'); return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/v1/admin/beacons/${editing.id}` : '/api/v1/admin/beacons';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editing) { setBeacons(prev => prev.map(b => b.id === saved.id ? saved : b)); addToast('success', 'Beacon updated'); }
      else { setBeacons(prev => [saved, ...prev]); addToast('success', 'Beacon created'); }
      closePanel();
    } catch { addToast('error', 'Failed to save beacon'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/beacons/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setBeacons(prev => prev.filter(b => b.id !== deleteTarget.id));
      addToast('success', 'Beacon deleted'); setDeleteTarget(null);
    } catch { addToast('error', 'Failed to delete beacon'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Radio size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Beacons</h2>
            <p className="text-xs text-zinc-500">Color-coded pulsing attention markers</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all">
          <Plus size={16} /> New Beacon
        </button>
      </div>

      {/* List */}
      <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-[#181b2e] rounded-xl animate-pulse">
                <div className="w-8 h-8 rounded-full bg-[#1e2238]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#1e2238] rounded w-1/3" />
                  <div className="h-3 bg-[#1e2238] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : beacons.length === 0 ? (
          <div className="p-20 text-center">
            <Radio size={48} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium mb-4">No beacons configured</p>
            <button onClick={openCreate} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all">
              Create your first beacon
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2238]">
            {beacons.map(beacon => (
              <motion.div
                key={beacon.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[#181b2e] transition-colors group"
              >
                {/* Pulsing dot */}
                <PulsingDot color={beacon.color} size={beacon.size} pulse={beacon.pulse_animation} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{beacon.label}</span>
                    <span className="text-xs text-zinc-600">·</span>
                    <span className="text-xs text-zinc-500">{beacon.name}</span>
                  </div>
                  {beacon.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{beacon.description}</p>
                  )}
                </div>

                {/* Meta chips */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0d0f17] border border-[#2a2f4c] text-xs text-zinc-400 capitalize">
                    <ActionIcon action={beacon.on_click_action} />
                    {beacon.on_click_action.replace(/_/g, ' ')}
                  </span>
                  <span className="inline-flex px-2 py-1 rounded-lg bg-[#0d0f17] border border-[#2a2f4c] text-xs text-zinc-400 capitalize">
                    {beacon.size}
                  </span>
                  {beacon.pulse_animation && (
                    <span className="inline-flex px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400">
                      Pulsing
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(beacon)} className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-zinc-400 hover:text-indigo-400 transition-colors"><Edit size={14} /></button>
                  <button onClick={() => setDeleteTarget(beacon)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

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
                  <h3 className="text-base font-bold text-white">{editing ? 'Edit Beacon' : 'New Beacon'}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Configure beacon appearance and behavior</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-lg hover:bg-[#181b2e] text-zinc-400 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Preview */}
                <div className="bg-[#0d0f17] border border-[#2a2f4c] rounded-xl p-4 flex items-center gap-4">
                  <PulsingDot color={form.color ?? '#6366f1'} size={form.size ?? 'medium'} pulse={form.pulse_animation ?? true} />
                  <div>
                    <p className="text-sm font-medium text-white">{form.label || 'Beacon Label'}</p>
                    <p className="text-xs text-zinc-500">{form.description || 'No description'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Internal Name <span className="text-red-400">*</span></label>
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. feature-beacon-v1" className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Display Label <span className="text-red-400">*</span></label>
                  <input type="text" value={form.label ?? ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. New Feature" className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Description</label>
                  <input type="text" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description..." className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Color</label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full transition-all ring-offset-2 ring-offset-[#181b2e] ${form.color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <input type="color" value={form.color ?? '#6366f1'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, size: s }))} className={`py-2 rounded-xl border text-xs font-medium capitalize transition-all ${form.size === s ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* Pulse */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Pulse Animation</label>
                  <button onClick={() => setForm(f => ({ ...f, pulse_animation: !f.pulse_animation }))} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.pulse_animation ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400'}`}>
                    {form.pulse_animation ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {form.pulse_animation ? 'Pulse Enabled' : 'Pulse Disabled'}
                  </button>
                </div>

                {/* On Click Action */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">On Click Action</label>
                  <div className="space-y-2">
                    {CLICK_ACTIONS.map(a => (
                      <button key={a} onClick={() => setForm(f => ({ ...f, on_click_action: a }))} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all ${form.on_click_action === a ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}>
                        <ActionIcon action={a} />
                        <span className="capitalize">{a.replace(/_/g, ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1e2238] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-[#2a2f4c] text-sm font-semibold text-zinc-400 hover:bg-[#181b2e] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Saving...' : 'Save Beacon'}
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
                <div><h4 className="font-bold text-white">Delete Beacon</h4><p className="text-xs text-zinc-500 mt-0.5">This action cannot be undone</p></div>
              </div>
              <p className="text-sm text-zinc-400 mb-5">Delete beacon <span className="font-semibold text-white">"{deleteTarget.label}"</span>?</p>
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
