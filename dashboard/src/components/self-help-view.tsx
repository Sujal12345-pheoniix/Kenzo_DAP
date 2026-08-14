import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Edit, Trash2, X, Save, AlertCircle, CheckCircle,
  Loader2, Search, ThumbsUp, Eye, Tag, Filter
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
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Self Help</h2>
            <p className="text-xs text-zinc-500">Knowledge base articles and help content</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all">
          <Plus size={16} /> New Article
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full bg-[#11131f] border border-[#1e2238] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        {categories.length > 0 && (
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <select
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="bg-[#11131f] border border-[#1e2238] rounded-xl pl-9 pr-8 py-2.5 text-sm text-zinc-300 outline-none focus:border-indigo-500 appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-5 animate-pulse space-y-2">
              <div className="h-4 bg-[#1e2238] rounded w-1/2" />
              <div className="h-3 bg-[#1e2238] rounded w-full" />
              <div className="h-3 bg-[#1e2238] rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-20 text-center">
          <BookOpen size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 font-medium mb-4">{search || categoryFilter ? 'No matching articles' : 'No articles yet'}</p>
          {!search && !categoryFilter && (
            <button onClick={openCreate} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all">Create your first article</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(article => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-5 hover:border-[#2a2f4c] transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="font-semibold text-white text-sm">{article.title}</h3>
                    {article.category && (
                      <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs rounded-full">{article.category}</span>
                    )}
                    <StatusBadge status={article.status} />
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{article.content}</p>

                  {article.tags && article.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {article.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0d0f17] border border-[#2a2f4c] rounded-full text-xs text-zinc-400">
                          <Tag size={10} />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(article)} className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-zinc-400 hover:text-indigo-400 transition-colors"><Edit size={13} /></button>
                    <button onClick={() => setDeleteTarget(article)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-600">
                    <span className="flex items-center gap-1"><Eye size={11} />{article.view_count ?? 0}</span>
                    <span className="flex items-center gap-1"><ThumbsUp size={11} />{article.helpful_count ?? 0}</span>
                  </div>
                </div>
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
                  <h3 className="text-base font-bold text-white">{editing ? 'Edit Article' : 'New Article'}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Write and configure your help article</p>
                </div>
                <button onClick={closePanel} className="p-2 rounded-lg hover:bg-[#181b2e] text-zinc-400 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Title <span className="text-red-400">*</span></label>
                  <input type="text" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. How to set up your first tour" className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Content <span className="text-red-400">*</span></label>
                  <textarea value={form.content ?? ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your article content..." rows={8} className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Category</label>
                  <input
                    type="text" value={form.category ?? ''}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    list="categories-list"
                    placeholder="e.g. Getting Started"
                    className="w-full bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <datalist id="categories-list">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Tags</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {(form.tags ?? []).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-400">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-red-400 transition-colors"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add tag and press Enter..." className="flex-1 bg-[#181b2e] border border-[#2a2f4c] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors" />
                    <button onClick={addTag} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors"><Plus size={14} /></button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['draft', 'published', 'archived'] as const).map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} className={`py-2.5 rounded-xl border text-xs font-medium capitalize transition-all ${form.status === s ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2f4c] bg-[#181b2e] text-zinc-400 hover:border-zinc-600'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1e2238] flex gap-3">
                <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl border border-[#2a2f4c] text-sm font-semibold text-zinc-400 hover:bg-[#181b2e] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#11131f] border border-[#1e2238] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><AlertCircle size={20} className="text-red-400" /></div>
                <div><h4 className="font-bold text-white">Delete Article</h4><p className="text-xs text-zinc-500">This action cannot be undone</p></div>
              </div>
              <p className="text-sm text-zinc-400 mb-5">Delete <span className="font-semibold text-white">"{deleteTarget.title}"</span>?</p>
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
