import { useState, useEffect } from 'react';
import { 
  Building2, 
  ExternalLink, 
  Plus, 
  Edit3, 
  Trash2, 
  Globe, 
  Calendar, 
  Search, 
  Clock, 
  Lock,
  Mail,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Organization {
  id: string;
  name: string;
  websiteUrl: string;
  description: string;
  domain?: string;
  industry?: string;
  plan: string;
  ownerEmail: string;
  expiresAt: string;
  createdAt: string;
}

interface OrganizationsViewProps {
  userRole?: string;
  headers: Record<string, string>;
}

export default function OrganizationsView({ userRole = 'CLIENT_CEO', headers }: OrganizationsViewProps) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    websiteUrl: '',
    description: '',
    ownerEmail: '',
    plan: 'Enterprise Tier',
    expiresAt: '2027-12-31'
  });

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/organizations', { headers });
      if (res.ok) {
        const data = await res.json();
        setOrgs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleOpenCreate = () => {
    setEditingOrg(null);
    setFormData({
      name: '',
      websiteUrl: 'https://',
      description: '',
      ownerEmail: '',
      plan: 'Enterprise Tier',
      expiresAt: '2027-12-31'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name || '',
      websiteUrl: org.websiteUrl || '',
      description: org.description || '',
      ownerEmail: org.ownerEmail || '',
      plan: org.plan || 'Enterprise Tier',
      expiresAt: org.expiresAt ? org.expiresAt.substring(0, 10) : '2027-12-31'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingOrg ? `/api/v1/admin/organizations/${editingOrg.id}` : '/api/v1/admin/organizations';
      const method = editingOrg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchOrgs();
      } else {
        const err = await res.json();
        alert(err.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving organization:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete organization "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/organizations/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchOrgs();
      }
    } catch (err) {
      console.error('Failed to delete organization:', err);
    }
  };

  const filteredOrgs = orgs.filter(o => 
    (o.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.websiteUrl || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.ownerEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dStr?: string) => {
    if (!dStr) return 'N/A';
    try {
      return new Date(dStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
      return dStr;
    }
  };

  return (
    <div className="space-y-6 select-none relative text-left w-full">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Organizations</h2>
            <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2.5 py-0.5 rounded-md border border-slate-700">
              {orgs.length} client sites
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Client sites and deployments</p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isSuperAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Read-Only (Super Admin Managed)</span>
            </div>
          )}
          {isSuperAdmin && (
            <button
              onClick={handleOpenCreate}
              className="kenzo-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Client Link</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0c1322] border border-slate-800 p-3 rounded-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter organizations by name, URL, or owner email..."
            className="kenzo-input w-full pl-8 py-1.5 text-xs placeholder-slate-500"
          />
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-1/3" />
              <div className="h-3 bg-slate-800 rounded w-full" />
              <div className="h-6 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Building2 size={24} />
          </div>
          <h3 className="text-sm font-semibold text-white">No Client Deployments Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {search ? 'No matching organizations found for your search filter.' : 'Register and manage client site links, access policies and API scopes.'}
          </p>
          {isSuperAdmin && (
            <button onClick={handleOpenCreate} className="kenzo-glow-btn px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
              Register First Site
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredOrgs.map((org) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0C1322] border border-slate-800 rounded-lg p-6 group hover:border-sky-500/40 transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-amber-400" />

              <div className="space-y-3.5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold uppercase tracking-wider">
                        {org.plan || 'Enterprise Tier'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold font-syne text-white group-hover:text-sky-300 transition-colors">
                      {org.name}
                    </h3>
                  </div>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(org)}
                        className="p-2 rounded-xl hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                        title="Edit Organization"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(org.id, org.name)}
                        className="p-2 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Organization"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {org.description || 'No description provided for this client deployment.'}
                </p>

                {/* Website Link Badge */}
                {org.websiteUrl && (
                  <div className="pt-1">
                    <a
                      href={org.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070d18] hover:bg-sky-500/15 border border-slate-800 hover:border-sky-500/30 text-sky-300 text-xs font-semibold transition-all group/link"
                    >
                      <Globe className="w-3.5 h-3.5 text-sky-400 group-hover/link:rotate-12 transition-transform" />
                      <span className="truncate max-w-xs">{org.websiteUrl}</span>
                      <ExternalLink className="w-3 h-3 text-sky-400 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Footer Metadata */}
              <div className="pt-4 mt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Owner Email</span>
                  <div className="flex items-center gap-1 text-slate-200 font-medium truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{org.ownerEmail || 'admin@kenzo.com'}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Date Added</span>
                  <div className="flex items-center gap-1 text-slate-200 font-medium">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{formatDate(org.createdAt)}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Date Expire</span>
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{formatDate(org.expiresAt)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Super Admin Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0C1322] border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold font-syne text-white">
                    {editingOrg ? 'Edit Organization Link' : 'Add Organization Link'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Website Link Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Kenzo ERP Workspace"
                    className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Website Link URL *</label>
                  <input
                    type="url"
                    required
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="e.g. https://client.kenzoinfosystems.com/"
                    className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs text-sky-300 placeholder-slate-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the application, architecture, or scope..."
                    className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Owner / Client Email</label>
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      placeholder="client@kenzo.com"
                      className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Subscription Plan</label>
                    <input
                      type="text"
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      placeholder="Enterprise Tier"
                      className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Date Expire *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="kenzo-glow-btn px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    {editingOrg ? 'Save Changes' : 'Create Link Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
