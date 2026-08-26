import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Edit, Trash2, X, Save, AlertCircle, CheckCircle,
  Loader2, Search, Tag, Filter
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  view_count?: number;
  helpful_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface GuidanceModuleProps {
  projectId: string;
  headers: Record<string, string>;
}

interface Toast { id: string; type: 'success' | 'error'; message: string; }

const emptyForm = (): Partial<Article> => ({
  title: '', content: '', category: '', tags: [], status: 'draft',
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

export default function SelfHelpView({ projectId, headers }: GuidanceModuleProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState<Partial<Article>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagInput, setTagInput] = useState('');

  const authHeaders = useCallback(() => ({
    ...headers, 'Content-Type': 'application/json', 'x-project-id': projectId,
  }), [headers, projectId]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/self-help', { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : data.articles ?? []);
    } catch { addToast('error', 'Failed to load articles'); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const categories = [...new Set(articles.map(a => a.category).filter(Boolean))];

  const filtered = articles.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setPanelOpen(true); };
  const openEdit = (a: Article) => { setEditing(a); setForm({ ...a, tags: [...(a.tags ?? [])] }); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setEditing(null); setForm(emptyForm()); setTagInput(''); };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || (form.tags ?? []).includes(trimmed)) return;
    setForm(f => ({ ...f, tags: [...(f.tags ?? []), trimmed] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: (f.tags ?? []).filter(t => t !== tag) }));

  const handleSave = async () => {
    if (!form.title?.trim() || !form.content?.trim()) {
      addToast('error', 'Title and content are required'); return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/v1/admin/self-help/${editing.id}` : '/api/v1/admin/self-help';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editing) { setArticles(prev => prev.map(a => a.id === saved.id ? saved : a)); addToast('success', 'Article updated'); }
      else { setArticles(prev => [saved, ...prev]); addToast('success', 'Article created'); }
      closePanel();
    } catch { addToast('error', 'Failed to save article'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/self-help/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setArticles(prev => prev.filter(a => a.id !== deleteTarget.id));
      addToast('success', 'Article deleted'); setDeleteTarget(null);
    } catch { addToast('error', 'Failed to delete article'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-8 select-none relative text-left w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <BookOpen size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne text-white tracking-tight">Self-Help & Knowledge Base</h2>
            <p className="text-xs text-slate-400 mt-0.5">Embeddable documentation, FAQs, and contextual troubleshooting guides</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b1324] border border-slate-800 text-xs text-slate-400 font-medium">
            <span>Total Articles:</span>
            <span className="font-bold text-sky-400">{articles.length}</span>
          </div>
          <button 
            onClick={openCreate} 
            className="kenzo-glow-btn text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search knowledge base articles..."
            className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
          />
        </div>
        {categories.length > 0 && (
          <div className="relative shrink-0">
            <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-2xl pl-9 pr-8 py-2.5 text-xs text-slate-300 outline-none appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#0b1324] text-white">All Categories</option>
              {categories.map(c => <option key={c} value={c} className="bg-[#0b1324] text-white">{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="kenzo-glass-card rounded-2xl p-5 animate-pulse space-y-2">
              <div className="h-4 bg-slate-800 rounded w-1/2" />
              <div className="h-3 bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="kenzo-glass-card rounded-3xl p-16 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 mx-auto mb-4">
            <BookOpen size={32} className="animate-pulse" />
          </div>
          <h3 className="text-base font-bold font-syne text-white">No Articles Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {search ? 'Try adjusting your search query' : 'Create helpful troubleshooting articles and product documentation.'}
          </p>
          <button onClick={openCreate} className="kenzo-glow-btn px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
            Create First Article
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(article => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="kenzo-glass-card rounded-2xl p-5 hover:border-sky-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-bold text-white text-sm font-syne group-hover:text-sky-300 transition-colors truncate">{article.title}</h3>
                  {article.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[10px] font-medium text-sky-300">
                      {article.category}
                    </span>
                  )}
                  <StatusBadge status={article.status} />
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{article.content}</p>
                {article.tags && article.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    {article.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#070d18] border border-slate-800 text-[10px] text-slate-400">
                        <Tag size={9} className="text-sky-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(article)} className="p-2 rounded-xl hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">
                  <Edit size={14} />
                </button>
                <button onClick={() => setDeleteTarget(article)} className="p-2 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </div>
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
                  <h3 className="text-base font-bold font-syne text-white">{editing ? 'Edit Article' : 'New Article'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Write and configure your contextual help content</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Article Title <span className="text-sky-400">*</span></label>
                  <input type="text" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. How to set up your project workspace" className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Content <span className="text-sky-400">*</span></label>
                  <textarea value={form.content ?? ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write step-by-step instructions or explanations..." rows={8} className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors resize-none leading-relaxed" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                  <input
                    type="text" value={form.category ?? ''}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    list="categories-list"
                    placeholder="e.g. Getting Started"
                    className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                  <datalist id="categories-list">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tags</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {(form.tags ?? []).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg text-xs text-sky-300">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-400 transition-colors"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add tag and press Enter..." className="flex-1 bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors" />
                    <button onClick={addTag} className="px-3.5 py-2 kenzo-glow-btn text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"><Plus size={14} /></button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['draft', 'published', 'archived'] as const).map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} className={`py-2.5 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${form.status === s ? 'border-sky-400 bg-sky-500/15 text-sky-300 font-semibold' : 'border-slate-800 bg-[#0b1324] text-slate-400 hover:border-slate-700'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-[#0b1324] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl kenzo-glow-btn text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Saving...' : 'Save Article'}
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
                <div><h4 className="font-bold font-syne text-white">Delete Article</h4><p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p></div>
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
