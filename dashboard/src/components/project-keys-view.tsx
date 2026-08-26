import { useState } from 'react';
import { Key, Copy, Check, Shield, Globe } from 'lucide-react';

interface ProjectKeysViewProps {
  apiKey: string;
  projectId?: string;
  projectName: string;
}

export default function ProjectKeysView({ apiKey, projectName }: ProjectKeysViewProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [origins, setOrigins] = useState(['https://app.client.com', 'https://staging.client.com', 'http://localhost:3000']);
  const [newOrigin, setNewOrigin] = useState('');

  const displayKey = apiKey || 'kenzo_live_sec_89df7189f381c810';

  const handleCopy = () => {
    navigator.clipboard.writeText(displayKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleAddOrigin = () => {
    if (newOrigin.trim() && !origins.includes(newOrigin.trim())) {
      setOrigins(prev => [...prev, newOrigin.trim()]);
      setNewOrigin('');
    }
  };

  const handleRemoveOrigin = (item: string) => {
    setOrigins(prev => prev.filter(o => o !== item));
  };

  return (
    <div className="space-y-6 select-none text-left w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">API Keys</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Credentials and access management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* API Key Management (7 cols) */}
        <div className="lg:col-span-7 bg-[#0C1322] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Key size={13} className="text-sky-400" />
              <span>Workspace Credentials</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Workspace: {projectName || 'Default'}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Client SDK Public Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#080e1a] border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 flex items-center justify-between">
                  <span>{revealed ? displayKey : displayKey.slice(0, 8) + '••••••••••••••••••••••••'}</span>
                  <button
                    type="button"
                    onClick={() => setRevealed(!revealed)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-sans cursor-pointer ml-2"
                  >
                    {revealed ? 'Hide' : 'Reveal'}
                  </button>
                </div>

                <button
                  onClick={handleCopy}
                  className="kenzo-btn-secondary text-xs shrink-0"
                >
                  {copiedKey ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Safe to embed in public client script tags.</p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                <span className="text-xs text-slate-300 font-medium">Automatic Key Rotation</span>
              </div>
              <span className="text-[11px] text-slate-400">Every 180 days</span>
            </div>
          </div>
        </div>

        {/* CORS Origins Allowed (5 cols) */}
        <div className="lg:col-span-5 bg-[#0C1322] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={13} className="text-sky-400" />
              <span>Allowed CORS Domains</span>
            </h3>
            <span className="text-[11px] text-slate-400">{origins.length} active</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newOrigin}
                onChange={e => setNewOrigin(e.target.value)}
                placeholder="https://yourdomain.com"
                className="kenzo-input flex-1 text-xs"
              />
              <button
                onClick={handleAddOrigin}
                className="kenzo-btn-primary text-xs shrink-0"
              >
                Add
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {origins.map(origin => (
                <div key={origin} className="bg-[#080e1a] border border-slate-800 px-3 py-1.5 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300 text-[11px] truncate">{origin}</span>
                  <button
                    onClick={() => handleRemoveOrigin(origin)}
                    className="text-slate-500 hover:text-red-400 text-xs ml-2 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
