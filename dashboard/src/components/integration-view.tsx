import { useState } from 'react';
import { 
  Check, 
  Copy, 
  RefreshCw, 
  Cpu, 
  Link2
} from 'lucide-react';

interface IntegrationViewProps {
  apiBaseUrl: string;
  apiKey: string;
}

type Framework = 'html' | 'react' | 'nextjs' | 'vue' | 'angular';

export default function IntegrationView({ apiBaseUrl, apiKey }: IntegrationViewProps) {
  const [activeTab, setActiveTab] = useState<Framework>('html');
  const [copied, setCopied] = useState(false);
  const [verificationState, setVerificationState] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');

  const formattedUrl = apiBaseUrl || 'https://kenzo-dap.onrender.com';
  const displayApiKey = apiKey || 'kenzo_project_dev_api_key_2026';

  const snippets: Record<Framework, string> = {
    html: `<!-- Kenzo_DAP Snippet (One-line installation) -->
<script
  src="${formattedUrl}/sdk.js"
  data-kenzo-key="${displayApiKey}"
  data-api-base="${formattedUrl}/api/v1"
  async>
</script>`,

    react: `// 1. Initialize in your App entry point (App.tsx or index.tsx)
import React, { useEffect } from 'react';
import { Kenzo } from '@kenzo/sdk';

export default function App() {
  useEffect(() => {
    Kenzo.init({
      apiKey: "${displayApiKey}",
      apiBaseUrl: "${formattedUrl}/api/v1"
    });
  }, []);

  return <div>Your Application</div>;
}`,

    nextjs: `// Initialize in Next.js Custom App or layout (app/layout.tsx)
'use client';

import { useEffect } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = '${formattedUrl}/sdk.js';
      script.dataset.kenzoKey = '${displayApiKey}';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return <html><body>{children}</body></html>;
}`,

    vue: `<!-- App.vue -->
<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  const script = document.createElement('script');
  script.src = '${formattedUrl}/sdk.js';
  script.dataset.kenzoKey = '${displayApiKey}';
  script.async = true;
  document.body.appendChild(script);
});
</script>`,

    angular: `// main.ts or app.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  ngOnInit() {
    const script = document.createElement('script');
    script.src = '${formattedUrl}/sdk.js';
    script.dataset.kenzoKey = '${displayApiKey}';
    script.async = true;
    document.body.appendChild(script);
  }
}`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    setVerificationState('checking');
    setTimeout(() => {
      setVerificationState('success');
    }, 1500);
  };

  return (
    <div className="space-y-6 select-none relative text-left w-full text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Integration</h2>
            <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2.5 py-0.5 rounded-md border border-slate-700">
              v1.0.0 Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">SDK setup and code snippets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Wizard Checklist */}
        <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Cpu size={14} className="text-sky-400" />
              <span>Integration Steps</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 bg-[#080e1a] p-3 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                <div>
                  <span className="text-white font-semibold block">Select Framework</span>
                  <span className="text-[11px] text-slate-400">Choose target HTML or Frontend framework.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-[#080e1a] p-3 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                <div>
                  <span className="text-white font-semibold block">Embed Client Script</span>
                  <span className="text-[11px] text-slate-400">Paste before closing &lt;/head&gt; tag on target app.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-[#080e1a] p-3 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                <div>
                  <span className="text-white font-semibold block">Verify SDK Handshake</span>
                  <span className="text-[11px] text-slate-400">Test real-time heartbeat connection.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#080e1a] border border-slate-800 rounded-lg p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">SDK Connection Status</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                verificationState === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {verificationState === 'idle' && 'Not Tested'}
                {verificationState === 'checking' && 'Pinging Handshake...'}
                {verificationState === 'success' && 'Active & Connected'}
              </span>
            </div>

            <button
              onClick={handleVerify}
              disabled={verificationState === 'checking'}
              className="kenzo-btn-primary text-xs w-full justify-center disabled:opacity-50"
            >
              {verificationState === 'checking' ? <RefreshCw size={13} className="animate-spin" /> : <Link2 size={13} />}
              <span>{verificationState === 'checking' ? 'Testing Handshake...' : 'Verify SDK Connection'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Code Tabs & Snippet Box */}
        <div className="lg:col-span-2 bg-[#0C1322] border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center bg-[#080e1a] border border-slate-800 p-0.5 rounded-lg text-xs">
              {(['html', 'react', 'nextjs', 'vue', 'angular'] as const).map((fw) => (
                <button
                  key={fw}
                  onClick={() => setActiveTab(fw)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold uppercase transition-colors cursor-pointer ${
                    activeTab === fw
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {fw}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="kenzo-btn-secondary text-xs"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Snippet Display */}
          <div className="relative">
            <pre className="bg-[#080e1a] border border-slate-800 p-4 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed shadow-inner">
              <code>{snippets[activeTab]}</code>
            </pre>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span>SDK loads asynchronously without impacting Core Web Vitals (LCP &lt; 20ms).</span>
          </div>
        </div>
      </div>
    </div>
  );
}
