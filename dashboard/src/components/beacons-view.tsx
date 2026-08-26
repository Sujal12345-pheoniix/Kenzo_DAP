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
  selector?: { type?: string; value?: string } | string;
  url_rules?: Array<{ type: string; pattern: string }>;
  status?: string;
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

const COMMON_ROUTES = [
  { label: 'All Pages (*)', pattern: '*' },
  { label: 'Dashboard Overview (/dashboard)', pattern: '/dashboard' },
  { label: 'CRM & Pipeline (/dashboard/crm)', pattern: '/dashboard/crm' },
  { label: 'HRMS & Employees (/dashboard/hrms)', pattern: '/dashboard/hrms' },
  { label: 'Projects & Tasks (/dashboard/projects)', pattern: '/dashboard/projects' },
  { label: 'Finance & Ledger (/dashboard/finance)', pattern: '/dashboard/finance' },
];

const sizeMap = { small: 'w-3 h-3', medium: 'w-4 h-4', large: 'w-5 h-5' };

const emptyForm = (): Partial<Beacon> => ({
  name: '', label: '', description: '',
  color: '#3b82f6', size: 'medium',
  pulse_animation: true, on_click_action: 'show_tooltip',
  selector: { type: 'css', value: 'button, .btn-primary, body' },
  url_rules: [{ type: 'contains', pattern: '/dashboard/crm' }],
  status: 'published',
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
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');
  const [targetRoutePattern, setTargetRoutePattern] = useState<string>('/dashboard/crm');
  const [targetCssSelector, setTargetCssSelector] = useState<string>('button, .btn-primary, body');
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setTargetRoutePattern('/dashboard/crm');
    setTargetCssSelector('button, .btn-primary, body');
    setPanelOpen(true);
  };
  const openEdit = (b: Beacon) => {
    setEditing(b);
    setForm({ ...b });
    const pat = b.url_rules && b.url_rules[0]?.pattern ? b.url_rules[0].pattern : '/dashboard/crm';
    setTargetRoutePattern(pat);
    const sel = typeof b.selector === 'string' ? b.selector : (b.selector?.value || 'button, body');
    setTargetCssSelector(sel);
    setPanelOpen(true);
  };
  const closePanel = () => { setPanelOpen(false); setEditing(null); setForm(emptyForm()); };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.label?.trim()) {
      addToast('error', 'Name and label are required'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        url_rules: [{ type: 'contains', pattern: targetRoutePattern || '*' }],
        selector: { type: 'css', value: targetCssSelector || 'body' },
        status: form.status || 'published',
      };
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/v1/admin/beacons/${editing.id}` : '/api/v1/admin/beacons';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editing) { setBeacons(prev => prev.map(b => b.id === saved.id ? saved : b)); addToast('success', 'Beacon updated'); }
      else { setBeacons(prev => [saved, ...prev]); addToast('success', 'Beacon created & published'); }
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

  const filteredBeacons = beacons.filter(b => {
    if (selectedRouteFilter === 'all') return true;
    const pat = b.url_rules && b.url_rules[0]?.pattern ? b.url_rules[0].pattern : '';
    return pat.includes(selectedRouteFilter) || pat === '*' || pat === '/';
  });

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Radio size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne text-white tracking-tight">Interactive Hotspot Beacons</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pulsing visual markers anchored to page elements by route</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b1324] border border-slate-800 text-xs text-slate-400 font-medium">
            <span>Total Beacons:</span>
            <span className="font-bold text-sky-400">{beacons.length}</span>
          </div>
          <button 
            onClick={openCreate} 
            className="kenzo-glow-btn text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>New Beacon</span>
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
          { id: 'crm', label: 'CRM (/crm)' },
          { id: 'projects', label: 'Projects (/projects)' },
          { id: 'hrms', label: 'HRMS (/hrms)' },
          { id: 'finance', label: 'Finance (/finance)' },
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

      {/* List */}
      <div className="kenzo-glass-card rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-[#070d18] rounded-xl animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBeacons.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 mx-auto mb-4">
              <Radio size={32} className="animate-pulse" />
            </div>
            <h3 className="text-base font-bold font-syne text-white">No Beacons Configured</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              Add interactive pulsing beacon markers to highlight features on this route.
            </p>
            <button onClick={openCreate} className="kenzo-glow-btn px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
              Create First Beacon
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredBeacons.map(beacon => {
              const routePat = beacon.url_rules && beacon.url_rules[0]?.pattern ? beacon.url_rules[0].pattern : '*';
              const selVal = typeof beacon.selector === 'string' ? beacon.selector : (beacon.selector?.value || 'body');
              return (
                <motion.div
                  key={beacon.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors group"
                >
                  {/* Pulsing dot */}
                  <PulsingDot color={beacon.color} size={beacon.size} pulse={beacon.pulse_animation} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm font-syne">{beacon.label}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-300">
                        {routePat}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                        {selVal}
                      </span>
                    </div>
                    {beacon.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{beacon.description}</p>
                    )}
                  </div>

                  {/* Action pill */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#070d18] border border-slate-800 text-[11px] text-slate-300 capitalize font-medium">
                    <ActionIcon action={beacon.on_click_action} />
                    {beacon.on_click_action.replace(/_/g, ' ')}
                  </span>

                  {/* Controls */}
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(beacon)} className="p-2 rounded-xl hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(beacon)} className="p-2 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

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
                  <h3 className="text-base font-bold font-syne text-white">{editing ? 'Edit Beacon' : 'New Hotspot Beacon'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configure beacon target element and pulsing style</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Internal Name <span className="text-sky-400">*</span></label>
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dashboard Reports Beacon" className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
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
                      placeholder="e.g. /dashboard/crm or /projects"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Display Label <span className="text-sky-400">*</span></label>
                  <input type="text" value={form.label ?? ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. New Feature" className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
                  <input type="text" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description..." className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hotspot Color</label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full transition-all ring-offset-2 ring-offset-[#0b1324] cursor-pointer ${form.color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <input type="color" value={form.color ?? '#38bdf8'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, size: s }))} className={`py-2 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${form.size === s ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'}`}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* Pulse */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pulse Animation</label>
                  <button onClick={() => setForm(f => ({ ...f, pulse_animation: !f.pulse_animation }))} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all w-full cursor-pointer ${form.pulse_animation ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400'}`}>
                    {form.pulse_animation ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {form.pulse_animation ? 'Pulse Enabled' : 'Pulse Disabled'}
                  </button>
                </div>

                {/* On Click Action */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">On Click Action</label>
                  <div className="space-y-2">
                    {CLICK_ACTIONS.map(a => (
                      <button key={a} onClick={() => setForm(f => ({ ...f, on_click_action: a }))} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs transition-all cursor-pointer ${form.on_click_action === a ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'}`}>
                        <ActionIcon action={a} />
                        <span className="capitalize">{a.replace(/_/g, ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-[#0b1324] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl kenzo-glow-btn text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0b1324] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center"><AlertCircle size={20} className="text-red-400" /></div>
                <div><h4 className="font-bold font-syne text-white">Delete Beacon</h4><p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p></div>
              </div>
              <p className="text-xs text-slate-300 mb-5 leading-relaxed">Are you sure you want to delete beacon <span className="font-semibold text-white">"{deleteTarget.label}"</span>?</p>
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
