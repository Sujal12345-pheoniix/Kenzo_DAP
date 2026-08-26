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
  url_rules?: Array<{ type: string; pattern: string }>;
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

const COMMON_ROUTES = [
  { label: 'All Pages (*)', pattern: '*' },
  { label: 'Dashboard Overview (/dashboard)', pattern: '/dashboard' },
  { label: 'CRM & Pipeline (/dashboard/crm)', pattern: '/dashboard/crm' },
  { label: 'HRMS & Employees (/dashboard/hrms)', pattern: '/dashboard/hrms' },
  { label: 'Projects & Tasks (/dashboard/projects)', pattern: '/dashboard/projects' },
  { label: 'Finance & Ledger (/dashboard/finance)', pattern: '/dashboard/finance' },
];

const emptyForm = (): Partial<Popup> => ({
  name: '', title: '', content: '',
  popup_type: 'modal', position: 'center',
  trigger_event: 'page_load', trigger_delay: 2,
  theme: 'dark', show_close_button: true, status: 'published',
  url_rules: [{ type: 'contains', pattern: '/dashboard' }],
});

function StatusBadge({ status }: { status?: string }) {
  const cfg = {
    published: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Published' },
    draft: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Draft' },
    archived: { dot: 'bg-zinc-500', text: 'text-zinc-400', label: 'Archived' },
  }[status ?? 'published'] ?? { dot: 'bg-zinc-500', text: 'text-zinc-400', label: status };
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
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');
  const [targetRoutePattern, setTargetRoutePattern] = useState<string>('/dashboard');
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setTargetRoutePattern('/dashboard');
    setPanelOpen(true);
  };
  const openEdit = (p: Popup) => {
    setEditing(p);
    setForm({ ...p });
    const pat = p.url_rules && p.url_rules[0]?.pattern ? p.url_rules[0].pattern : '/dashboard';
    setTargetRoutePattern(pat);
    setPanelOpen(true);
  };
  const closePanel = () => { setPanelOpen(false); setEditing(null); setForm(emptyForm()); };

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
      const url = editing ? `/api/v1/admin/popups/${editing.id}` : '/api/v1/admin/popups';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editing) { setPopups(prev => prev.map(p => p.id === saved.id ? saved : p)); addToast('success', 'Popup updated'); }
      else { setPopups(prev => [saved, ...prev]); addToast('success', 'Popup created & published'); }
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

  const filteredPopups = popups.filter(p => {
    if (selectedRouteFilter === 'all') return true;
    const pat = p.url_rules && p.url_rules[0]?.pattern ? p.url_rules[0].pattern : '';
    return pat.includes(selectedRouteFilter) || pat === '*' || pat === '/';
  });

  return (
    <div className="space-y-8 select-none relative text-left w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Layers size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne text-white tracking-tight">Pop-ups, Modals & Announcements</h2>
            <p className="text-xs text-slate-400 mt-0.5">Announcement modals, slide-overs, feature releases & interactive notifications</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b1324] border border-slate-800 text-xs text-slate-400 font-medium">
            <span>Total Popups:</span>
            <span className="font-bold text-sky-400">{popups.length}</span>
          </div>
          <button 
            onClick={openCreate} 
            className="kenzo-glow-btn text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>New Popup</span>
          </button>
        </div>
      </div>

      {/* Route Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1.5 shrink-0">
          Filter Route:
        </span>
        {[
          { id: 'all', label: 'All Routes' },
          { id: '/dashboard', label: 'Overview (/dashboard)' },
          { id: 'crm', label: 'CRM (/crm)' },
          { id: 'hrms', label: 'HRMS (/hrms)' },
          { id: 'projects', label: 'Projects (/projects)' },
        ].map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRouteFilter(r.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedRouteFilter === r.id 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm' 
                : 'bg-[#0b1324] border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="kenzo-glass-card rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-2/3" />
              <div className="h-3 bg-slate-800 rounded w-full" />
              <div className="h-3 bg-slate-800 rounded w-4/5" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-16 bg-slate-800 rounded-full" />
                <div className="h-6 w-16 bg-slate-800 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPopups.length === 0 ? (
        <div className="kenzo-glass-card rounded-3xl p-16 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 mx-auto mb-4">
            <Layers size={32} className="animate-pulse" />
          </div>
          <h3 className="text-base font-bold font-syne text-white">No Pop-ups Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Create announcement banners or modal overlays for this application route.
          </p>
          <button onClick={openCreate} className="kenzo-glow-btn px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
            Create Your First Popup
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPopups.map(popup => {
            const routePat = popup.url_rules && popup.url_rules[0]?.pattern ? popup.url_rules[0].pattern : '*';
            return (
              <motion.div
                key={popup.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="kenzo-glass-card rounded-3xl p-6 group hover:border-sky-500/40 transition-all flex flex-col justify-between relative overflow-hidden"
              >
                {/* Header Gradient line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-amber-400" />

                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="font-bold text-white text-sm font-syne truncate group-hover:text-sky-300 transition-colors">{popup.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 truncate">{popup.title}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-300">
                          {routePat}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(popup)} className="p-1.5 rounded-lg hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(popup)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{popup.content || 'No content provided'}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#070d18] border border-slate-800 text-[11px] text-slate-300 capitalize font-medium">
                      <TypeIcon type={popup.popup_type} />
                      {popup.popup_type}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#070d18] border border-slate-800 text-[11px] text-slate-300 font-medium">
                      <Clock size={11} className="text-sky-400" />
                      {popup.trigger_delay}s {popup.trigger_event}
                    </span>
                    <StatusBadge status={popup.status} />
                  </div>
                </div>
              </motion.div>
            );
          })}
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
                  <h3 className="text-base font-bold font-syne text-white">{editing ? 'Edit Popup' : 'New Popup'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configure popup settings and visual presentation</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Popup Name <span className="text-sky-400">*</span></label>
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Modal" className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
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
                      placeholder="e.g. /dashboard or /dashboard/crm"
                      className="w-full bg-[#070d18] border border-slate-800 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs font-mono text-sky-300 placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Display Title <span className="text-sky-400">*</span></label>
                  <input type="text" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Welcome to the Platform!" className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Content</label>
                  <textarea value={form.content ?? ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Enter popup body text..." rows={4} className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors resize-none" />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Popup Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {POPUP_TYPES.map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, popup_type: t }))} className={`py-2 rounded-xl border text-xs font-medium capitalize transition-all flex items-center justify-center gap-1.5 cursor-pointer ${form.popup_type === t ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'}`}>
                        <TypeIcon type={t} />{t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map(p => (
                      <button key={p} onClick={() => setForm(f => ({ ...f, position: p }))} className={`py-2 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${form.position === p ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trigger */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Trigger Event</label>
                    <div className="relative">
                      <select value={form.trigger_event ?? 'page_load'} onChange={e => setForm(f => ({ ...f, trigger_event: e.target.value as any }))} className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none appearance-none">
                        {TRIGGER_EVENTS.map(t => <option key={t} value={t} className="bg-[#0b1324] text-white">{t.replace(/_/g, ' ')}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Delay (seconds)</label>
                    <input type="number" min={0} value={form.trigger_delay ?? 0} onChange={e => setForm(f => ({ ...f, trigger_delay: parseInt(e.target.value) || 0 }))} className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none" />
                  </div>
                </div>

                {/* Theme & Close Button */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['dark', 'light'] as const).map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, theme: t }))} className={`py-2 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${form.theme === t ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Show Close Button</label>
                    <button onClick={() => setForm(f => ({ ...f, show_close_button: !f.show_close_button }))} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all w-full cursor-pointer ${form.show_close_button ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400'}`}>
                      {form.show_close_button ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {form.show_close_button ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['draft', 'published'] as const).map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} className={`py-2.5 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${form.status === s ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-[#0b1324] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl kenzo-glow-btn text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0b1324] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center"><AlertCircle size={20} className="text-red-400" /></div>
                <div><h4 className="font-bold font-syne text-white">Delete Popup</h4><p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p></div>
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
