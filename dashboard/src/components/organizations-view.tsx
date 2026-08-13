import React, { useState, useEffect } from 'react';
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
    <div className="p-8 space-y-6 bg-[#0c0e17] min-h-screen text-slate-100 font-sans antialiased">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141727] p-6 rounded-2xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white font-outfit">Organizations & Client Sites</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Manage deployed client application links, subscription contracts, and expiration schedules.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {!isSuperAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              Read-Only View (Super Admin Managed)
            </div>
          )}
          {isSuperAdmin && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Organization Link
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-[#121524] p-4 rounded-xl border border-white/5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, website link, owner email..."
            className="w-full bg-[#181b2e] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="text-xs text-zinc-400 font-medium">
          Showing <span className="text-indigo-400 font-bold">{filteredOrgs.length}</span> Organizations
        </div>
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-xs animate-pulse">Loading organization metadata...</div>
      ) : filteredOrgs.length === 0 ? (
        <div className="bg-[#121524] border border-white/5 rounded-2xl p-12 text-center space-y-3">
          <Globe className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Organizations Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            No client website links have been added to this workspace registry yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOrgs.map((org) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#131627] border border-white/10 hover:border-indigo-500/40 transition-all rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4 relative group"
            >
              <div className="space-y-3">
                {/* Title & Action Buttons */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                      {org.plan || 'Enterprise Tier'}
                    </span>
                    <h2 className="text-lg font-bold text-white tracking-tight leading-snug">{org.name}</h2>
                  </div>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(org)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                        title="Edit Organization"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(org.id, org.name)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Delete Organization"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                  {org.description || 'No description provided for this client deployment.'}
                </p>

                {/* Website Link Badge */}
                {org.websiteUrl && (
                  <div className="pt-1">
                    <a
                      href={org.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all group/link"
                    >
                      <Globe className="w-3.5 h-3.5 text-indigo-400 group-hover/link:rotate-12 transition-transform" />
                      <span className="truncate max-w-xs">{org.websiteUrl}</span>
                      <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Footer Metadata */}
              <div className="pt-4 border-t border-white/5 grid grid-cols-3 gap-2 text-[11px] text-zinc-400">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Owner Email</span>
                  <div className="flex items-center gap-1 text-zinc-300 font-medium truncate">
                    <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="truncate">{org.ownerEmail || 'admin@kenzo.com'}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Date Added</span>
                  <div className="flex items-center gap-1 text-zinc-300 font-medium">
                    <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span>{formatDate(org.createdAt)}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Date Expire</span>
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141727] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">
                    {editingOrg ? 'Edit Organization Link' : 'Add Organization Link'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 mb-1 block">Website Link Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. TruthBomb Fact Verification"
                    className="w-full bg-[#1b1f33] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 mb-1 block">Website Link URL *</label>
                  <input
                    type="url"
                    required
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="e.g. https://truth-bomb-eight.vercel.app/"
                    className="w-full bg-[#1b1f33] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 mb-1 block">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the application, architecture, or scope..."
                    className="w-full bg-[#1b1f33] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 mb-1 block">Owner / Client Email</label>
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      placeholder="client1@kenzo.com"
                      className="w-full bg-[#1b1f33] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 mb-1 block">Subscription Plan</label>
                    <input
                      type="text"
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      placeholder="Enterprise Tier"
                      className="w-full bg-[#1b1f33] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 mb-1 block">Date Expire *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full bg-[#1b1f33] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/30"
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
