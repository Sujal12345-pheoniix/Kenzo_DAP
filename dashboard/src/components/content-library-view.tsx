import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Library, Plus, Trash2, X, Save, AlertCircle, CheckCircle,
  Loader2, Search, Filter, FileText, Image, Video, Code2, BarChart2
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
  template: { icon: <FileText size={16} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  image: { icon: <Image size={16} />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  video: { icon: <Video size={16} />, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
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
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Library size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Content Library</h2>
            <p className="text-xs text-zinc-500">Templates, images, videos and scripts</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all">
          <Plus size={16} /> Add Content
        </button>
      </div>

      {/* Type Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {CONTENT_TYPES.map(t => {
          const tc = typeConfig[t];
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(prev => prev === t ? '' : t)}
              className={`p-3 rounded-xl border transition-all text-left ${typeFilter === t ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#1e2238] bg-[#11131f] hover:border-[#2a2f4c]'}`}
            >
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center mb-2 ${tc.bg} ${tc.color}`}>{tc.icon}</div>
              <div className="text-lg font-bold text-white">{typeCounts[t]}</div>
              <div className="text-xs text-zinc-500 capitalize">{t}s</div>
            </button>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search content..." className="w-full bg-[#11131f] border border-[#1e2238] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
        </div>
        {categories.length > 0 && (
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-[#11131f] border border-[#1e2238] rounded-xl pl-9 pr-8 py-2.5 text-sm text-zinc-300 outline-none focus:border-indigo-500 appearance-none">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#11131f] border border-[#1e2238] rounded-2xl animate-pulse">
              <div className="h-36 bg-[#181b2e] rounded-t-2xl" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-[#1e2238] rounded w-2/3" />
                <div className="h-3 bg-[#1e2238] rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-20 text-center">
          <Library size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 font-medium mb-4">{search || typeFilter || categoryFilter ? 'No matching content' : 'Your library is empty'}</p>
          {!search && !typeFilter && !categoryFilter && (
            <button onClick={openCreate} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all">Add your first item</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const tc = typeConfig[item.content_type];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#11131f] border border-[#1e2238] rounded-2xl overflow-hidden hover:border-[#2a2f4c] transition-all group"
              >
                {/* Thumbnail / Placeholder */}
                <div className="h-36 bg-gradient-to-br from-[#181b2e] to-[#0d0f17] flex items-center justify-center relative">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${tc.bg} ${tc.color}`}>
                    <div className="scale-150">{tc.icon}</div>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-white text-sm flex-1 min-w-0 truncate mr-2">{item.name}</h3>
                  </div>
                  {item.description && <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{item.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${tc.bg} ${tc.color}`}>
                        {tc.icon}<span className="capitalize">{item.content_type}</span>
                      </span>
                      {item.category && (
                        <span className="px-2 py-0.5 bg-[#0d0f17] border border-[#2a2f4c] text-zinc-500 text-xs rounded-full">{item.category}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-600">
                      <BarChart2 size={11} />
                      <span>{item.usage_count ?? 0} uses</span>
                    </div>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closePanel} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-[#11131f] border-l border-[#1e2238] z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2238]">
                <div>
                  <h3 className="text-base font-bold text-white">Add Content Item</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Add a new item to your content library</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-lg hover:bg-[#181b2e] text-zinc-400 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Name <span className="text-red-400">*</span></label>
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Email Template" className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Description</label>
                  <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={3} className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Content Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONTENT_TYPES.map(t => {
                      const tc = typeConfig[t];
                      return (
                        <button key={t} onClick={() => setForm(f => ({ ...f, content_type: t }))} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${form.content_type === t ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}>
                          <span className={tc.color}>{tc.icon}</span>
                          <span className="capitalize text-xs font-medium">{t}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Category</label>
                  <input
                    type="text" value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    list="lib-categories" placeholder="e.g. Onboarding"
                    className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <datalist id="lib-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1e2238] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-[#2a2f4c] text-sm font-semibold text-zinc-400 hover:bg-[#181b2e] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><AlertCircle size={20} className="text-red-400" /></div>
                <div><h4 className="font-bold text-white">Delete Content Item</h4><p className="text-xs text-zinc-500">This action cannot be undone</p></div>
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
