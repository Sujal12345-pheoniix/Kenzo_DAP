import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Library, Plus, Trash2, X, Save, AlertCircle, CheckCircle,
  Loader2, Search, Filter, FileText, Image, Video, Code2
} from 'lucide-react';

interface ContentItem {
  id: string;
  name: string;
  description?: string;
  content_type: 'template' | 'image' | 'video' | 'script';
  category: string;
  usage_count?: number;
  thumbnail?: string;
  createdAt?: string;
}

interface GuidanceModuleProps {
  projectId: string;
  headers: Record<string, string>;
}

interface Toast { id: string; type: 'success' | 'error'; message: string; }

const CONTENT_TYPES = ['template', 'image', 'video', 'script'] as const;

const emptyForm = (): Partial<ContentItem> => ({
  name: '', description: '', content_type: 'template', category: '',
});

const typeConfig: Record<string, { icon: JSX.Element; color: string; bg: string }> = {
  template: { icon: <FileText size={16} />, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  image: { icon: <Image size={16} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  video: { icon: <Video size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  script: { icon: <Code2 size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

export default function ContentLibraryView({ projectId, headers }: GuidanceModuleProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<Partial<ContentItem>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const authHeaders = useCallback(() => ({
    ...headers, 'Content-Type': 'application/json', 'x-project-id': projectId,
  }), [headers, projectId]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/content-library', { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items ?? []);
    } catch { addToast('error', 'Failed to load content library'); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || item.content_type === typeFilter;
    const matchCat = !categoryFilter || item.category === categoryFilter;
    return matchSearch && matchType && matchCat;
  });

  const openCreate = () => { setForm(emptyForm()); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setForm(emptyForm()); };

  const handleSave = async () => {
    if (!form.name?.trim()) { addToast('error', 'Name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/content-library', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setItems(prev => [saved, ...prev]);
      addToast('success', 'Content item created');
      closePanel();
    } catch { addToast('error', 'Failed to create content item'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/content-library/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      addToast('success', 'Item deleted'); setDeleteTarget(null);
    } catch { addToast('error', 'Failed to delete item'); }
    finally { setDeleting(false); }
  };

  // Stats per type
  const typeCounts = CONTENT_TYPES.reduce((acc, t) => {
    acc[t] = items.filter(i => i.content_type === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8 select-none relative text-left w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Library size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne text-white tracking-tight">Content & Asset Library</h2>
            <p className="text-xs text-slate-400 mt-0.5">Reusable layout templates, media assets, scripts & shared widgets</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b1324] border border-slate-800 text-xs text-slate-400 font-medium">
            <span>Total Assets:</span>
            <span className="font-bold text-sky-400">{items.length}</span>
          </div>
          <button 
            onClick={openCreate} 
            className="kenzo-glow-btn text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>Add Content</span>
          </button>
        </div>
      </div>

      {/* Type Stats Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {CONTENT_TYPES.map(t => {
          const tc = typeConfig[t];
          const isSelected = typeFilter === t;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(prev => prev === t ? '' : t)}
              className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                isSelected 
                  ? 'border-sky-500/60 bg-sky-500/15 shadow-lg shadow-sky-500/10' 
                  : 'kenzo-glass-card hover:border-slate-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-2.5 ${tc.bg} ${tc.color}`}>{tc.icon}</div>
              <div className="text-xl font-bold text-white">{typeCounts[t]}</div>
              <div className="text-xs text-slate-400 capitalize font-medium">{t}s</div>
            </button>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search content library assets..." 
            className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" 
          />
        </div>
        {categories.length > 0 && (
          <div className="relative shrink-0">
            <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)} 
              className="bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-2xl pl-9 pr-8 py-2.5 text-xs text-slate-300 outline-none appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#0b1324] text-white">All Categories</option>
              {categories.map(c => <option key={c} value={c} className="bg-[#0b1324] text-white">{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="kenzo-glass-card rounded-3xl animate-pulse overflow-hidden">
              <div className="h-32 bg-slate-800" />
              <div className="p-5 space-y-2">
                <div className="h-4 bg-slate-700 rounded w-2/3" />
                <div className="h-3 bg-slate-700 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="kenzo-glass-card rounded-3xl p-16 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 mx-auto mb-4">
            <Library size={32} className="animate-pulse" />
          </div>
          <h3 className="text-base font-bold font-syne text-white">No Content Assets Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {search ? 'Try adjusting your search filters' : 'Add reusable components, media assets, or code templates.'}
          </p>
          <button onClick={openCreate} className="kenzo-glow-btn px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
            Add First Asset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(item => {
            const tc = typeConfig[item.content_type] ?? typeConfig.template;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="kenzo-glass-card rounded-3xl overflow-hidden hover:border-sky-500/40 transition-all flex flex-col justify-between group shadow-xl"
              >
                <div className="h-28 bg-[#070d18] border-b border-slate-800/80 flex items-center justify-center relative">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${tc.bg} ${tc.color}`}>
                    {tc.icon}
                  </div>
                  <div className="absolute top-3 right-3 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg bg-[#0b1324] border border-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium capitalize ${tc.bg} ${tc.color}`}>
                        {item.content_type}
                      </span>
                      {item.category && (
                        <span className="text-[10px] font-medium text-slate-400 bg-[#070d18] border border-slate-800 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm font-syne group-hover:text-sky-300 transition-colors truncate">{item.name}</h3>
                    {item.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-slate-800/60 text-slate-400 font-mono text-[11px]">
                    <span>Asset ID</span>
                    <span className="text-slate-300 font-mono truncate max-w-[120px]">{item.id.slice(0, 8)}...</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Panel */}
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
                  <h3 className="text-base font-bold font-syne text-white">Add Content Item</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Upload or register an asset in your library</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Asset Name <span className="text-sky-400">*</span></label>
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Modal Graphic" className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
                  <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief summary of usage..." rows={3} className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Content Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONTENT_TYPES.map(t => {
                      const tc = typeConfig[t];
                      return (
                        <button key={t} onClick={() => setForm(f => ({ ...f, content_type: t }))} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition-all cursor-pointer ${form.content_type === t ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'}`}>
                          <span className={tc.color}>{tc.icon}</span>
                          <span className="capitalize font-medium">{t}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                  <input
                    type="text" value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    list="lib-categories" placeholder="e.g. Onboarding"
                    className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                  <datalist id="lib-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-[#0b1324] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl kenzo-glow-btn text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Adding...' : 'Add Content'}
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
                <div><h4 className="font-bold font-syne text-white">Delete Asset</h4><p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p></div>
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
