import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  BookOpen, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  TrendingUp
} from 'lucide-react';

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
  const [copied, setCopied] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  const fetchBaseUrl = () => {
    // Resolve base url dynamically
    const url = window.location.origin;
    setApiBaseUrl(url);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const flowsRes = await fetch('/api/v1/admin/flows');
      const flowsData = await flowsRes.json();
      setFlows(Array.isArray(flowsData) ? flowsData : []);

      const analyticsRes = await fetch('/api/v1/admin/analytics/summary');
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading admin portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseUrl();
    loadData();
  }, []);

  const handleCopySnippet = () => {
    const snippet = `<!-- Kenzo Digital Adoption Platform Snippet -->
<script src="${apiBaseUrl}/sdk.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof Kenzo !== 'undefined') {
      Kenzo.init({
        apiKey: "kenzo_project_dev_api_key_2026",
        apiBaseUrl: "${apiBaseUrl}/api/v1"
      });
    }
  });
</script>`;
    
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this walkthrough tour?')) return;
    try {
      const res = await fetch(`/api/v1/admin/flows/${flowId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFlows(flows.filter(f => f.id !== flowId));
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
        alert('Walkthrough details updated!');
        setEditingFlow(null);
        loadData();
      }
    } catch (err) {
      alert('Save failed: ' + err);
    }
  };

  // Helper calculation for global completion metrics
  const getCompletionRate = () => {
    if (!analytics || analytics.tourMetrics.length === 0) return '0%';
    const totalStarts = analytics.tourMetrics.reduce((sum, item) => sum + item.starts, 0);
    const totalCompletions = analytics.tourMetrics.reduce((sum, item) => sum + item.completions, 0);
    if (totalStarts === 0) return '0%';
    return `${((totalCompletions / totalStarts) * 100).toFixed(1)}%`;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      
      {/* Sidebar */}
      <div style={{
        width: '280px',
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #a5b4fc, #6366f1)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'Outfit, sans-serif'
          }}>K</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Kenzo DAP</h1>
            <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>ADMIN PORTAL</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <button 
            onClick={() => { setActiveTab('dashboard'); setEditingFlow(null); }}
            className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            style={navBtnStyle(activeTab === 'dashboard')}
          >
            <BarChart3 size={18} />
            Analytics Dashboard
          </button>

          <button 
            onClick={() => { setActiveTab('walkthroughs'); setEditingFlow(null); }}
            className={`nav-button ${activeTab === 'walkthroughs' ? 'active' : ''}`}
            style={navBtnStyle(activeTab === 'walkthroughs')}
          >
            <Layers size={18} />
            Walkthrough Tours
          </button>

          <button 
            onClick={() => { setActiveTab('integration'); setEditingFlow(null); }}
            className={`nav-button ${activeTab === 'integration' ? 'active' : ''}`}
            style={navBtnStyle(activeTab === 'integration')}
          >
            <BookOpen size={18} />
            Snippet Install
          </button>
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a href="/sandbox.html" target="_blank" rel="noreferrer" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
          }}>
            Open CRM Sandbox
            <ExternalLink size={14} />
          </a>
          <button onClick={loadData} style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            <RefreshCw size={14} />
            Sync Dashboard
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px', boxSizing: 'border-box' }}>
        
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading analytics and configurations...</p>
          </div>
        ) : (
          <>
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div>
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '2rem', margin: 0, fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Overview Metrics</h2>
                  <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Real-time user engagement tracking across your platform.</p>
                </div>

                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                  <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL ENGAGEMENT EVENTS</span>
                      <TrendingUp size={16} style={{ color: '#6366f1' }} />
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                      {analytics?.totalEvents.toLocaleString() ?? 0}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Active tracking running</span>
                  </div>

                  <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>COMPLETION RATE</span>
                      <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                      {getCompletionRate()}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aggregate across all active tours</span>
                  </div>

                  <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>ACTIVE WALKTHROUGHS</span>
                      <Layers size={16} style={{ color: '#a5b4fc' }} />
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                      {flows.filter(f => f.status === 'published').length}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Out of {flows.length} total tours</span>
                  </div>
                </div>

                {/* Flow Metrics Table */}
                <div className="glass" style={{ padding: '24px', marginBottom: '40px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem' }}>Walkthrough Onboarding Funnel</h3>
                  {(!analytics || analytics.tourMetrics.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      No tour interactions recorded yet. Launch the sandbox and play a tour to record analytics!
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tour Name</th>
                          <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Started</th>
                          <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Completed</th>
                          <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Dismissed</th>
                          <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Drop-off %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.tourMetrics.map(metric => {
                          const dropoff = metric.starts > 0 
                            ? `${(((metric.starts - metric.completions) / metric.starts) * 100).toFixed(0)}%`
                            : '0%';
                          return (
                            <tr key={metric.flowId} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '16px', fontWeight: 500 }}>{metric.name}</td>
                              <td style={{ padding: '16px' }}>{metric.starts}</td>
                              <td style={{ padding: '16px', color: 'var(--success)', fontWeight: 600 }}>{metric.completions}</td>
                              <td style={{ padding: '16px' }}>{metric.dismissals}</td>
                              <td style={{ padding: '16px', color: '#f87171', fontWeight: 600 }}>{dropoff}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB: WALKTHROUGHS */}
            {activeTab === 'walkthroughs' && (
              <div>
                {!editingFlow ? (
                  <div>
                    <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '2rem', margin: 0, fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Walkthrough Tours</h2>
                        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Manage the list of onboarding flows in your database.</p>
                      </div>
                      <a href="/sandbox.html?kenzo_builder=true" target="_blank" rel="noreferrer" style={{
                        background: 'linear-gradient(135deg, #a5b4fc, #6366f1)',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        ⚡ Create Tour Visually
                      </a>
                    </div>

                    <div className="glass" style={{ padding: '24px' }}>
                      {flows.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                          <Layers size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '16px' }} />
                          <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.1rem' }}>No Walks Created Yet</h4>
                          <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem' }}>Open the CRM Sandbox with builder mode enabled to capture elements and save steps.</p>
                          <a href="/sandbox.html?kenzo_builder=true" target="_blank" style={{
                            display: 'inline-flex',
                            background: '#1f2937',
                            border: '1px solid var(--border)',
                            color: '#fff',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}>Launch Sandbox Builder</a>
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                              <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Tour Name</th>
                              <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Target Route</th>
                              <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Steps</th>
                              <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Status</th>
                              <th style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {flows.map(flow => (
                              <tr key={flow.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '16px' }}>
                                  <div style={{ fontWeight: 600 }}>{flow.name}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{flow.description || 'No description'}</div>
                                </td>
                                <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#a5b4fc' }}>
                                  {flow.urlRules?.[0]?.pattern || 'Any Page'}
                                </td>
                                <td style={{ padding: '16px' }}>
                                  <span style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600
                                  }}>{flow.stepCount || 0} steps</span>
                                </td>
                                <td style={{ padding: '16px' }}>
                                  {flow.status === 'published' ? (
                                    <span style={{ color: 'var(--success)', background: 'rgba(16,179,129,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <CheckCircle2 size={12} /> Published
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <XCircle size={12} /> Draft
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '8px' }}>
                                    <button 
                                      onClick={() => setEditingFlow(flow)}
                                      style={{ background: 'transparent', border: '1px solid var(--border)', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                                    >
                                      Edit Details
                                    </button>
                                    {flow.status === 'published' ? (
                                      <button 
                                        onClick={() => handleUpdateFlowStatus(flow, 'draft')}
                                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                                      >
                                        Revert to Draft
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => handleUpdateFlowStatus(flow, 'published')}
                                        style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                                      >
                                        Publish
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleDeleteFlow(flow.id)}
                                      style={{ background: 'transparent', border: 'none', color: '#f87171', padding: '6px', cursor: 'pointer' }}
                                      title="Delete Tour"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ) : (
                  // Editing Sub-view
                  <div className="glass" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem' }}>Edit Tour Configuration</h3>
                      <button 
                        onClick={() => setEditingFlow(null)}
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Back to List
                      </button>
                    </div>

                    <form onSubmit={handleSaveFlowDetails} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>TOUR NAME</label>
                          <input 
                            type="text" 
                            value={editingFlow.name}
                            onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>STATUS</label>
                          <select 
                            value={editingFlow.status}
                            onChange={(e) => setEditingFlow({ ...editingFlow, status: e.target.value as any })}
                            style={inputStyle}
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>DESCRIPTION</label>
                        <textarea 
                          value={editingFlow.description}
                          onChange={(e) => setEditingFlow({ ...editingFlow, description: e.target.value })}
                          rows={3}
                          style={inputStyle}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>PRIORITY WEIGHT</label>
                          <input 
                            type="number" 
                            value={editingFlow.priority}
                            onChange={(e) => setEditingFlow({ ...editingFlow, priority: parseInt(e.target.value) || 0 })}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>VERSION</label>
                          <input 
                            type="number" 
                            value={editingFlow.version}
                            disabled
                            style={{ ...inputStyle, background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                          />
                        </div>
                      </div>

                      <button type="submit" style={{
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '10px'
                      }}>Save Walkthrough Details</button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SNIPPET INSTALL */}
            {activeTab === 'integration' && (
              <div>
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '2rem', margin: 0, fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Single-Snippet Installation</h2>
                  <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Embed this single script to load all published tours automatically on your website.</p>
                </div>

                <div className="glass" style={{ padding: '32px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>HTML EMBED SCRIPT</span>
                    <button 
                      onClick={handleCopySnippet}
                      style={{
                        background: copied ? 'rgba(16,179,129,0.2)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)',
                        color: copied ? '#10b981' : '#fff',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  <pre style={{
                    background: '#09090b',
                    padding: '20px',
                    borderRadius: '8px',
                    overflowX: 'auto',
                    margin: 0,
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    color: '#a5b4fc',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
{`<!-- Kenzo Digital Adoption Platform Snippet -->
<script src="${apiBaseUrl}/sdk.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof Kenzo !== 'undefined') {
      Kenzo.init({
        apiKey: "kenzo_project_dev_api_key_2026",
        apiBaseUrl: "${apiBaseUrl}/api/v1"
      });
    }
  });
</script>`}
                  </pre>

                  <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#fff' }}>How it works:</h4>
                    <ol style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-muted)', lineHeight: '1.7', fontSize: '0.9rem' }}>
                      <li>Copy the script snippet above.</li>
                      <li>Paste it into the HTML of your website, right before the closing <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>&lt;/body&gt;</code> tag.</li>
                      <li>The script fetches all your published tours from the Neon database and registers listeners.</li>
                      <li>When a user visits a page that matches the URL rules of any tour, the tour starts automatically!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Styling helpers
const navBtnStyle = (isActive: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '12px 16px',
  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
  border: 'none',
  borderRadius: '8px',
  color: isActive ? '#a5b4fc' : 'var(--text-muted)',
  fontSize: '0.95rem',
  fontWeight: isActive ? '600' : '500',
  textAlign: 'left' as const,
  cursor: 'pointer',
  transition: 'all 0.2s',
  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: '#fff',
  boxSizing: 'border-box',
  fontSize: '0.9rem',
  outline: 'none',
  fontFamily: 'inherit',
};
