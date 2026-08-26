import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar, { TabType } from './components/sidebar';
import TopNav from './components/top-nav';
import CommandPalette from './components/command-palette';
import AnalyticsView from './components/analytics-view';
import ToursView from './components/tours-view';
import IntegrationView from './components/integration-view';
import InsightsBuilder from './components/insights-builder';
import LoginView from './components/login-view';
import SmartTipsView from './components/smart-tips-view';
import PopupsView from './components/popups-view';
import BeaconsView from './components/beacons-view';
import TaskListsView from './components/task-lists-view';
import SurveysView from './components/surveys-view';
import SelfHelpView from './components/self-help-view';
import ContentLibraryView from './components/content-library-view';
import AuditLogsView from './components/audit-logs-view';
import OrganizationsView from './components/organizations-view';
import { X, Sparkles, Building2 } from 'lucide-react';

interface Flow {
  id: string;
  name: string;
  description: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  urlRules?: Array<{ type: string; pattern: string }>;
  priority: number;
  stepCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsSummary {
  totalEvents: number;
  eventsByType: Array<{ type: string; count: string }>;
  tourMetrics: Array<{
    flowId: string;
    name: string;
    starts: number;
    completions: number;
    dismissals: number;
  }>;
  stepMetrics: Array<{
    flowId: string;
    stepId: string;
    stepIndex: number;
    views: number;
  }>;
}

interface Project {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
}

interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'CLIENT_CEO' | 'MEMBER';
  companyId: string;
  companyName: string;
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('kenzo_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [flows, setFlows] = useState<Flow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Multi-tenant project states
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');

  // Project registration states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('kenzo_jwt_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => { setApiBaseUrl(window.location.origin); }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/v1/admin/projects', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0) {
          const savedId = localStorage.getItem('kenzo_active_project_id');
          const exists = data.some((p: any) => p.id === savedId);
          setActiveProjectId(exists && savedId ? savedId : data[0].id);
        } else {
          setActiveProjectId('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects list:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { ...getAuthHeaders(), 'x-project-id': activeProjectId || 'default-project' };
      const flowsRes = await fetch('/api/v1/admin/flows', { headers });
      setFlows(flowsRes.ok ? (await flowsRes.json()) : []);
      const analyticsRes = await fetch('/api/v1/admin/analytics/summary', { headers });
      setAnalytics(analyticsRes.ok ? await analyticsRes.json() : null);
    } catch (err) {
      console.error('Error loading admin portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadProjects();
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setIsCommandPaletteOpen(p => !p); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [user]);

  useEffect(() => {
    if (activeProjectId && user) {
      localStorage.setItem('kenzo_active_project_id', activeProjectId);
      loadData();
    }
  }, [activeProjectId, user]);

  const handleLoginSuccess = (data: {
    token: string;
    user: UserSession;
    projects: Array<{ id: string; name: string; apiKey: string }>;
  }) => {
    // Clear any stale project cache from a previous session
    localStorage.removeItem('kenzo_active_project_id');
    localStorage.setItem('kenzo_jwt_token', data.token);
    localStorage.setItem('kenzo_user_session', JSON.stringify(data.user));
    setUser(data.user);
    const userProjects = (data.projects || []) as any[];
    setProjects(userProjects);
    setActiveProjectId(userProjects.length > 0 ? userProjects[0].id : '');
    setActiveTab(data.user.role === 'SUPER_ADMIN' ? 'overview' : 'ceo_overview');
  };

  const handleLogout = () => {
    localStorage.removeItem('kenzo_jwt_token');
    localStorage.removeItem('kenzo_user_session');
    localStorage.removeItem('kenzo_active_project_id');
    setUser(null);
    setProjects([]);
    setActiveProjectId('');
  };

  const handleCreateProject = async (name: string, url?: string, clientEmail?: string) => {
    try {
      const apiKey = `kenzo_project_${Date.now()}_key_${Math.random().toString(36).substring(2, 8)}`;
      const res = await fetch('/api/v1/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, apiKey, domainUrl: url, clientEmail }),
      });

      if (res.ok) {
        const newProj = await res.json();
        setProjects(prev => [...prev, newProj]);
        setActiveProjectId(newProj.id);
        setIsRegisterModalOpen(false);
        setNewProjectName('');
        setNewProjectUrl('');
        setNewClientEmail('');
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete workspace "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = projects.filter(p => p.id !== id);
        setProjects(updated);
        if (updated.length > 0) {
          setActiveProjectId(updated[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleDeleteFlow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this walkthrough tour?')) return;
    try {
      const res = await fetch(`/api/v1/admin/flows/${id}`, {
        method: 'DELETE',
        headers: { 'x-project-id': activeProjectId },
      });
      if (res.ok) {
        setFlows(prev => prev.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete flow:', err);
    }
  };

  const handleUpdateFlowStatus = async (id: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      const endpoint = newStatus === 'published' ? `/api/v1/admin/flows/${id}/publish` : `/api/v1/admin/flows/${id}`;
      const method = newStatus === 'published' ? 'POST' : 'PUT';
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': activeProjectId,
        },
        body: newStatus === 'published' ? undefined : JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setFlows(prev =>
          prev.map(f => (f.id === id ? { ...f, status: newStatus } : f))
        );
      }
    } catch (err) {
      console.error('Failed to update flow status:', err);
    }
  };

  const handleSaveFlowDetails = async (id: string, updatedData: Partial<Flow>) => {
    try {
      const res = await fetch(`/api/v1/admin/flows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': activeProjectId,
        },
        body: JSON.stringify(updatedData),
      });

      if (res.ok) {
        const saved = await res.json();
        setFlows(prev => prev.map(f => (f.id === id ? { ...f, ...saved } : f)));
        setEditingFlow(null);
      }
    } catch (err) {
      console.error('Failed to save flow details:', err);
    }
  };

  const getCompletionRate = () => {
    if (!analytics || !analytics.tourMetrics || analytics.tourMetrics.length === 0) return '0%';
    let totalStarts = 0;
    let totalCompletions = 0;
    analytics.tourMetrics.forEach(m => {
      totalStarts += m.starts || 0;
      totalCompletions += m.completions || 0;
    });
    if (totalStarts === 0) return '0%';
    return `${Math.round((totalCompletions / totalStarts) * 100)}%`;
  };

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activePublishedCount = flows.filter(f => f.status === 'published').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#05090f] text-[#f8fafc] font-sans antialiased selection:bg-sky-500/30 selection:text-white">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        loadData={loadData} 
        flowsCount={flows.length} 
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
        onDeleteProject={handleDeleteProject}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-[#05090f]">
        
        {/* Ambient Kenzo Glow Blurs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <TopNav 
          activeTab={activeTab} 
          onSearchClick={() => setIsCommandPaletteOpen(true)}
          flowsCount={flows.length}
        />

        {/* Dynamic Pages Area */}
        <main className="flex-1 overflow-y-auto relative p-6 md:p-8 flex flex-col min-h-0">
          
          {loading ? (
            <div className="space-y-6 animate-pulse text-left w-full max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-7 w-56 bg-slate-800/80 rounded-xl" />
                  <div className="h-3.5 w-72 bg-slate-800/40 rounded-lg" />
                </div>
                <div className="h-10 w-32 bg-slate-800/60 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-32 bg-[#0b1324]/80 border border-slate-800/60 rounded-2xl" />
                <div className="h-32 bg-[#0b1324]/80 border border-slate-800/60 rounded-2xl" />
                <div className="h-32 bg-[#0b1324]/80 border border-slate-800/60 rounded-2xl" />
              </div>
              <div className="h-96 bg-[#0b1324]/80 border border-slate-800/60 rounded-2xl" />
            </div>
          ) : (
            <div className="fade-in transition-all duration-300 w-full max-w-7xl mx-auto flex-1 flex flex-col">
              {/* Analytics / Overview */}
              {(activeTab === 'overview' || activeTab === 'analytics_overview' || activeTab === 'ceo_overview' || activeTab === 'ceo_analytics') && (
                <AnalyticsView analytics={analytics} flowsCount={flows.length} activePublishedCount={activePublishedCount} getCompletionRate={getCompletionRate} />
              )}

              {/* Flows / Walkthroughs */}
              {(activeTab === 'guidance_flows' || activeTab === 'ceo_walkthroughs') && (
                <ToursView flows={flows} editingFlow={editingFlow} setEditingFlow={setEditingFlow} handleDeleteFlow={handleDeleteFlow} handleUpdateFlowStatus={handleUpdateFlowStatus} handleSaveFlowDetails={handleSaveFlowDetails} apiKey={activeProject?.apiKey || ''} />
              )}

              {/* Smart Tips */}
              {(activeTab === 'smart_tips' || activeTab === 'guidance_tips' || activeTab === 'ceo_smart_tips') && (
                <SmartTipsView projectId={activeProjectId} headers={{ ...getAuthHeaders(), 'x-project-id': activeProjectId }} />
              )}

              {/* Popups */}
              {(activeTab === 'popups' || activeTab === 'guidance_popups' || activeTab === 'ceo_popups') && (
                <PopupsView projectId={activeProjectId} headers={{ ...getAuthHeaders(), 'x-project-id': activeProjectId }} />
              )}

              {/* Beacons */}
              {(activeTab === 'beacons' || activeTab === 'guidance_beacons' || activeTab === 'ceo_beacons') && (
                <BeaconsView projectId={activeProjectId} headers={{ ...getAuthHeaders(), 'x-project-id': activeProjectId }} />
              )}

              {/* Task Lists */}
              {(activeTab === 'task_lists' || activeTab === 'guidance_tasks' || activeTab === 'ceo_task_lists') && (
                <TaskListsView projectId={activeProjectId} headers={{ ...getAuthHeaders(), 'x-project-id': activeProjectId }} />
              )}

              {/* Surveys */}
              {(activeTab === 'surveys' || activeTab === 'guidance_surveys' || activeTab === 'ceo_surveys') && (
                <SurveysView projectId={activeProjectId} headers={{ ...getAuthHeaders(), 'x-project-id': activeProjectId }} />
              )}

              {/* Self Help */}
              {(activeTab === 'self_help' || activeTab === 'ceo_self_help' || activeTab === 'guidance_selfhelp' || activeTab === 'ceo_selfhelp') && (
                <SelfHelpView projectId={activeProjectId} headers={{ ...getAuthHeaders(), 'x-project-id': activeProjectId }} />
              )}

              {/* Content Library */}
              {activeTab === 'content_library' && (
                <ContentLibraryView projectId={activeProjectId} headers={{ ...getAuthHeaders(), 'x-project-id': activeProjectId }} />
              )}

              {/* Audit Logs */}
              {(activeTab === 'audit_logs' || activeTab === 'ceo_audit') && (
                <AuditLogsView projectId={activeProjectId} headers={{ ...getAuthHeaders(), 'x-project-id': activeProjectId }} />
              )}

              {/* Organizations & Client Sites */}
              {(activeTab === 'organizations' || activeTab === 'ceo_orgs') && (
                <OrganizationsView userRole={user.role} headers={getAuthHeaders()} />
              )}

              {/* Trends & Insights */}
              {(activeTab === 'trends' || activeTab === 'ceo_growth') && (
                <InsightsBuilder apiKey={activeProject?.apiKey || ''} onBack={() => setActiveTab('overview')} />
              )}

              {/* Integrations */}
              {activeTab === 'integrations' && (
                <IntegrationView apiBaseUrl={apiBaseUrl} apiKey={activeProject?.apiKey || ''} />
              )}

              {/* Generic fallback for other tabs */}
              {!['overview','analytics_overview','ceo_overview','ceo_analytics','organizations','ceo_orgs','guidance_flows','ceo_walkthroughs','smart_tips','guidance_tips','ceo_smart_tips','popups','guidance_popups','ceo_popups','beacons','guidance_beacons','ceo_beacons','task_lists','guidance_tasks','ceo_task_lists','surveys','guidance_surveys','ceo_surveys','self_help','ceo_self_help','guidance_selfhelp','ceo_selfhelp','content_library','audit_logs','ceo_audit','trends','ceo_growth','integrations'].includes(activeTab) && (
                <div className="w-full flex-1 flex items-center justify-center py-16">
                  <div className="kenzo-glass-card p-12 rounded-3xl border border-sky-500/20 text-center max-w-lg mx-auto space-y-4 shadow-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 mx-auto">
                      <Sparkles size={28} className="animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold font-syne text-white capitalize">Kenzo_DAP — {activeTab.replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Module active under role <span className="font-bold text-sky-400">{user.role}</span>. Scoped to workspace: <span className="font-bold text-white">{activeProject?.name || 'Default Project'}</span>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Command Console Modal */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveTab={setActiveTab}
        loadData={loadData}
        flows={flows}
      />

      {/* Register Workspace Modal */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="kenzo-glass-card rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-left relative overflow-hidden"
            >
              {/* Header Gradient line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-amber-400" />

              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-syne text-white">Create Workspace</h3>
                    <p className="text-[11px] text-slate-400">Register a new client application tenant</p>
                  </div>
                </div>
                <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Application Name <span className="text-sky-400">*</span></label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Acme Corp — ERP Portal"
                    className="w-full bg-[#070d18] border border-slate-700/60 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Domain URL (Optional)</label>
                  <input
                    type="text"
                    value={newProjectUrl}
                    onChange={(e) => setNewProjectUrl(e.target.value)}
                    placeholder="e.g. https://erp.acmecorp.com"
                    className="w-full bg-[#070d18] border border-slate-700/60 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Assigned Client Email (Optional)</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="e.g. client.admin@acmecorp.com"
                    className="w-full bg-[#070d18] border border-slate-700/60 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateProject(newProjectName, newProjectUrl, newClientEmail)}
                    disabled={!newProjectName.trim()}
                    className="kenzo-glow-btn px-5 py-2.5 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Create Workspace
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
