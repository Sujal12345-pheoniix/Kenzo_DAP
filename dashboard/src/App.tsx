import React, { useState, useEffect } from 'react';
import Sidebar from './components/sidebar';
import TopNav from './components/top-nav';
import CommandPalette from './components/command-palette';
import AnalyticsView from './components/analytics-view';
import ToursView from './components/tours-view';
import IntegrationView from './components/integration-view';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'walkthroughs' | 'integration'>('dashboard');
  const [flows, setFlows] = useState<Flow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const fetchBaseUrl = () => {
    const url = window.location.origin;
    setApiBaseUrl(url);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const flowsRes = await fetch('/api/v1/admin/flows');
      if (flowsRes.ok) {
        const flowsData = await flowsRes.json();
        setFlows(Array.isArray(flowsData) ? flowsData : []);
      } else {
        console.error('Failed to fetch flows:', flowsRes.statusText);
        setFlows([]);
      }

      const analyticsRes = await fetch('/api/v1/admin/analytics/summary');
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
      // Small simulated delay for premium transition flow
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchBaseUrl();
    loadData();

    // Setup global Ctrl+K listener
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this walkthrough tour?')) return;
    try {
      const res = await fetch(`/api/v1/admin/flows/${flowId}`, {
        method: 'DELETE',
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
      const res = await fetch(`/api/v1/admin/flows/${flow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/v1/admin/flows/${editingFlow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const activePublishedCount = flows.filter(f => f.status === 'published').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-zinc-100 font-sans antialiased">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        loadData={loadData} 
        flowsCount={flows.length} 
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
            <div className="fade-in transition-all duration-300">
              {activeTab === 'dashboard' && (
                <AnalyticsView 
                  analytics={analytics} 
                  flowsCount={flows.length}
                  activePublishedCount={activePublishedCount}
                  getCompletionRate={getCompletionRate}
                />
              )}

              {activeTab === 'walkthroughs' && (
                <ToursView 
                  flows={flows} 
                  editingFlow={editingFlow}
                  setEditingFlow={setEditingFlow}
                  handleDeleteFlow={handleDeleteFlow}
                  handleUpdateFlowStatus={handleUpdateFlowStatus}
                  handleSaveFlowDetails={handleSaveFlowDetails}
                />
              )}

              {activeTab === 'integration' && (
                <IntegrationView apiBaseUrl={apiBaseUrl} />
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
    </div>
  );
}
