import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText, Search, Filter, ChevronLeft, ChevronRight,
  Loader2, Shield, Globe
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'PUBLISH';
  resource_type: string;
  resource_name: string;
  ip_address?: string;
  details?: Record<string, unknown>;
}

interface GuidanceModuleProps {
  projectId: string;
  headers: Record<string, string>;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  UPDATE: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/30',
  VIEW: 'text-slate-400 bg-slate-800 border-slate-700',
  PUBLISH: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

const PAGE_SIZE = 20;

function formatDate(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch { return ts; }
}

export default function AuditLogsView({ projectId, headers }: GuidanceModuleProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const authHeaders = useCallback(() => ({
    ...headers, 'x-project-id': projectId,
  }), [headers, projectId]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      if (resourceFilter) params.set('resource_type', resourceFilter);

      const res = await fetch(`/api/v1/admin/audit-logs?${params.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const logsArr = Array.isArray(data) ? data : data.logs ?? data.items ?? [];
      setLogs(logsArr);
      setTotal(data.total ?? logsArr.length);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, page, search, actionFilter, resourceFilter]);

  useEffect(() => { setPage(0); }, [search, actionFilter, resourceFilter]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const resourceTypes = [...new Set(logs.map(l => l.resource_type).filter(Boolean))];

  return (
    <div className="space-y-8 select-none relative text-left w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <ScrollText size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne text-white tracking-tight">Security & Activity Audit Logs</h2>
            <p className="text-xs text-slate-400 mt-0.5">Immutable audit trail of administrator changes, publish events & access</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0b1324] border border-slate-800 px-3.5 py-2 rounded-xl">
          <Shield size={14} className="text-sky-400" />
          <span>Read-only · <strong className="text-white">{total.toLocaleString()}</strong> events logged</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by user email, resource name..."
            className="w-full bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
          />
        </div>

        <div className="relative">
          <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-2xl pl-9 pr-8 py-2.5 text-xs text-slate-300 outline-none appearance-none cursor-pointer">
            <option value="" className="bg-[#0b1324] text-white">All Actions</option>
            {['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'PUBLISH'].map(a => (
              <option key={a} value={a} className="bg-[#0b1324] text-white">{a}</option>
            ))}
          </select>
        </div>

        {resourceTypes.length > 0 && (
          <div className="relative">
            <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={resourceFilter} onChange={e => setResourceFilter(e.target.value)} className="bg-[#0b1324] border border-slate-700/80 focus:border-sky-400 rounded-2xl pl-9 pr-8 py-2.5 text-xs text-slate-300 outline-none appearance-none cursor-pointer">
              <option value="" className="bg-[#0b1324] text-white">All Resources</option>
              {resourceTypes.map(r => <option key={r} value={r} className="bg-[#0b1324] text-white">{r}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="kenzo-glass-card rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800/80 bg-[#070d18]/70">
                {['Timestamp', 'User', 'Action', 'Resource Type', 'Resource Target', 'IP Address'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="hover:bg-slate-800/20">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3.5 bg-slate-800 rounded animate-pulse" style={{ width: `${50 + j * 8}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ScrollText size={40} className="text-slate-600" />
                      <p className="text-slate-400 font-medium">No audit logs recorded for this filter</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <motion.tr
                    key={log.id ?? idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs text-slate-400 font-mono">{formatDate(log.timestamp)}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <span className="text-xs text-white font-medium truncate block">{log.user_email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-bold tracking-wide ${ACTION_COLORS[log.action] ?? 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-300 font-medium">{log.resource_type}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <span className="text-xs text-slate-300 truncate block font-mono">{log.resource_name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-400 font-mono">{log.ip_address ?? '—'}</span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800/80 bg-[#070d18]/40">
            <span className="text-xs text-slate-400">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pg = page < 3 ? i : page - 2 + i;
                  if (pg >= totalPages) return null;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-7 h-7 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        pg === page 
                          ? 'bg-sky-500 text-white shadow-sm' 
                          : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {pg + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator for refetch */}
      <AnimatePresence>
        {loading && logs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-[#0b1324] border border-slate-700 rounded-2xl shadow-xl">
            <Loader2 size={14} className="animate-spin text-sky-400" />
            <span className="text-xs text-slate-300">Refreshing logs...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
