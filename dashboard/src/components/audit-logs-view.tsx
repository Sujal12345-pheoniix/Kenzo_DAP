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
  UPDATE: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/30',
  VIEW: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
  PUBLISH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
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
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <ScrollText size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Audit Logs</h2>
            <p className="text-xs text-zinc-500">Immutable activity trail for your workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-[#11131f] border border-[#1e2238] px-3 py-2 rounded-xl">
          <Shield size={13} className="text-indigo-400" />
          <span>Read-only · {total.toLocaleString()} total events</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by user, resource..."
            className="w-full bg-[#11131f] border border-[#1e2238] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-[#11131f] border border-[#1e2238] rounded-xl pl-9 pr-8 py-2.5 text-sm text-zinc-300 outline-none focus:border-indigo-500 appearance-none">
            <option value="">All Actions</option>
            {['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'PUBLISH'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {resourceTypes.length > 0 && (
          <div className="relative">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <select value={resourceFilter} onChange={e => setResourceFilter(e.target.value)} className="bg-[#11131f] border border-[#1e2238] rounded-xl pl-9 pr-8 py-2.5 text-sm text-zinc-300 outline-none focus:border-indigo-500 appearance-none">
              <option value="">All Resources</option>
              {resourceTypes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-[#1e2238]">
                {['Timestamp', 'User', 'Action', 'Resource Type', 'Resource Name', 'IP Address'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-[#1e2238]">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-[#1e2238] rounded animate-pulse" style={{ width: `${50 + j * 8}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ScrollText size={40} className="text-zinc-700" />
                      <p className="text-zinc-500 font-medium">No audit logs found</p>
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
                    className="border-b border-[#1e2238] hover:bg-[#181b2e] transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-zinc-400 font-mono">{formatDate(log.timestamp)}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="text-sm text-white truncate block">{log.user_email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold tracking-wide ${ACTION_COLORS[log.action] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-300 font-medium">{log.resource_type}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-sm text-zinc-400 truncate block">{log.resource_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500 font-mono">{log.ip_address ?? '—'}</span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2238]">
            <span className="text-xs text-zinc-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-[#2a2f4c] text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                      className={`w-7 h-7 text-xs rounded-lg transition-all ${pg === page ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-[#181b2e]'}`}
                    >
                      {pg + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-[#2a2f4c] text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-[#181b2e] border border-[#2a2f4c] rounded-xl shadow-xl">
            <Loader2 size={14} className="animate-spin text-indigo-400" />
            <span className="text-xs text-zinc-400">Refreshing logs...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
