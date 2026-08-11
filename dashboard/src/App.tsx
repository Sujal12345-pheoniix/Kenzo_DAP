import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/sidebar';
import TopNav from './components/top-nav';
import CommandPalette from './components/command-palette';
import AnalyticsView from './components/analytics-view';
import ToursView from './components/tours-view';
import IntegrationView from './components/integration-view';
import InsightsBuilder from './components/insights-builder';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights' | 'walkthroughs' | 'integration'>('dashboard');
  const [flows, setFlows] = useState<Flow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
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

  const fetchBaseUrl = () => {
    const url = window.location.origin;
    setApiBaseUrl(url);
  };

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/v1/admin/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0) {
          const savedId = localStorage.getItem('kenzo_active_project_id');
          const exists = data.some((p: any) => p.id === savedId);
          const defaultId = exists && savedId ? savedId : data[0].id;
          setActiveProjectId(defaultId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects list:', err);
    }
  };

  const loadData = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const headers = { 'x-project-id': activeProjectId };
      const flowsRes = await fetch('/api/v1/admin/flows', { headers });
      if (flowsRes.ok) {
        const flowsData = await flowsRes.json();
        setFlows(Array.isArray(flowsData) ? flowsData : []);
      } else {
        console.error('Failed to fetch flows:', flowsRes.statusText);
        setFlows([]);
      }

      const analyticsRes = await fetch('/api/v1/admin/analytics/summary', { headers });
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      } else {
        console.error('Failed to fetch analytics summary:', analyticsRes.statusText);
        setAnalytics(null);
      }
    } catch (err) {
      console.error('Error loading admin portal data:', err);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  useEffect(() => {
    fetchBaseUrl();
    loadProjects();

    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('kenzo_active_project_id', activeProjectId);
      loadData();
    }
  }, [activeProjectId]);

  const handleCreateProject = async (name: string, url?: string) => {
    try {
      const res = await fetch('/api/v1/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url })
      });
      if (res.ok) {
        const newProj = await res.json();
        setProjects(prev => [newProj, ...prev]);
        setActiveProjectId(newProj.id);
      } else {
        alert('Failed to register website: ' + res.statusText);
      }
    } catch (err) {
      alert('Failed to register website: ' + err);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (projects.length <= 1) {
      alert('You must keep at least one website workspace in the dashboard.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete the website "${projectName}"?\n\nThis will delete all its flows, steps, and analytics data.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/admin/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const remaining = projects.filter(p => p.id !== projectId);
        setProjects(remaining);
        if (activeProjectId === projectId) {
          setActiveProjectId(remaining[0].id);
        }
        alert(`Successfully deleted website: ${projectName}`);
      } else {
        alert('Failed to delete website.');
      }
    } catch (err) {
      alert('Delete failed: ' + err);
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this walkthrough tour?')) return;
    try {
      const headers = activeProjectId ? { 'x-project-id': activeProjectId } : undefined;
      const res = await fetch(`/api/v1/admin/flows/${flowId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setFlows(flows.filter((f: Flow) => f.id !== flowId));
        if (editingFlow?.id === flowId) setEditingFlow(null);
        loadData();
      }
    } catch (err) {
      alert('Delete failed: ' + err);
    }
  };

  const handleUpdateFlowStatus = async (flow: Flow, status: 'draft' | 'published') => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(activeProjectId ? { 'x-project-id': activeProjectId } : {})
      };
      const res = await fetch(`/api/v1/admin/flows/${flow.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...flow,
          status
        })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      alert('Status update failed: ' + err);
    }
  };

  const handleSaveFlowDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlow) return;

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(activeProjectId ? { 'x-project-id': activeProjectId } : {})
      };
      const res = await fetch(`/api/v1/admin/flows/${editingFlow.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editingFlow)
      });
      if (res.ok) {
        setEditingFlow(null);
        loadData();
      }
    } catch (err) {
      alert('Save failed: ' + err);
    }
  };

  const getCompletionRate = () => {
    if (!analytics || !analytics.tourMetrics || analytics.tourMetrics.length === 0) return '0%';
    const totalStarts = analytics.tourMetrics.reduce((sum: number, item: any) => sum + item.starts, 0);
    const totalCompletions = analytics.tourMetrics.reduce((sum: number, item: any) => sum + item.completions, 0);
    if (totalStarts === 0) return '0%';
    return `${((totalCompletions / totalStarts) * 100).toFixed(1)}%`;
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activePublishedCount = flows.filter(f => f.status === 'published').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-zinc-100 font-sans antialiased">
      
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
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Header */}
        <TopNav 
          activeTab={activeTab} 
          onSearchClick={() => setIsCommandPaletteOpen(true)}
          flowsCount={flows.length}
        />

        {/* Dynamic Pages Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          
          {loading ? (
            /* Premium Skeleton Shimmer Loader */
            <div className="space-y-8 animate-pulse text-left">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-zinc-800 rounded-lg"></div>
                  <div className="h-3 w-64 bg-zinc-900 rounded"></div>
                </div>
                <div className="h-8 w-24 bg-zinc-850 rounded-lg"></div>
              </div>

              {/* Grid loader */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-28 bg-zinc-900 border border-zinc-850 rounded-xl"></div>
                <div className="h-28 bg-zinc-900 border border-zinc-850 rounded-xl"></div>
                <div className="h-28 bg-zinc-900 border border-zinc-850 rounded-xl"></div>
              </div>

              {/* Larger pane loader */}
              <div className="h-44 bg-zinc-900 border border-zinc-850 rounded-xl"></div>
            </div>
          ) : (
            <div className="fade-in transition-all duration-350">
              {activeTab === 'dashboard' && (
                <AnalyticsView 
                  analytics={analytics} 
                  flowsCount={flows.length}
                  activePublishedCount={activePublishedCount}
                  getCompletionRate={getCompletionRate}
                />
              )}

              {activeTab === 'insights' && (
                <InsightsBuilder apiKey={activeProject?.apiKey || ''} />
              )}

              {activeTab === 'walkthroughs' && (
                <ToursView 
                  flows={flows} 
                  editingFlow={editingFlow}
                  setEditingFlow={setEditingFlow}
                  handleDeleteFlow={handleDeleteFlow}
                  handleUpdateFlowStatus={handleUpdateFlowStatus}
                  handleSaveFlowDetails={handleSaveFlowDetails}
                  apiKey={activeProject?.apiKey || ''}
                />
              )}

              {activeTab === 'integration' && (
                <IntegrationView 
                  apiBaseUrl={apiBaseUrl} 
                  apiKey={activeProject?.apiKey || ''} 
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Command Console modal */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveTab={setActiveTab}
        loadData={loadData}
        flows={flows}
      />

      {/* Custom Register Website Modal */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-left"
            >
              <h3 className="text-base font-bold font-outfit text-white uppercase tracking-wider mb-2">Register New Website</h3>
              <p className="text-zinc-500 text-xs mb-6 leading-normal">Create a separate workspace to isolate walkthrough campaigns and analytics for a domain.</p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newProjectName.trim()) return;
                await handleCreateProject(newProjectName.trim(), newProjectUrl.trim());
                setIsRegisterModalOpen(false);
                setNewProjectName('');
                setNewProjectUrl('');
              }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Website Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CrickBuddy"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Website URL (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. https://crickbuddy.com"
                    value={newProjectUrl}
                    onChange={e => setNewProjectUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all"
                  />
                  <span className="text-[9px] text-zinc-500 leading-normal block mt-1">If provided, we'll auto-scope the Onboarding triggers directly to this domain route.</span>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsRegisterModalOpen(false);
                      setNewProjectName('');
                      setNewProjectUrl('');
                    }}
                    className="flex-1 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-550 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/10 focus:outline-none"
                  >
                    Register Workspace
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
