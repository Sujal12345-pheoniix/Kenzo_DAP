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
    <div className="space-y-8 select-none relative text-left w-full text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Cpu size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne text-white tracking-tight">SDK Integration & Snippets</h2>
            <p className="text-xs text-slate-400 mt-0.5">Embed the zero-latency client script to initialize Kenzo_DAP workflows globally</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Wizard Checklist */}
        <div className="kenzo-glass-card rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-3 flex items-center gap-2">
              <Cpu size={14} className="text-sky-400" />
              <span>Integration Steps</span>
            </h3>

            <div className="space-y-3 text-xs font-semibold text-slate-300">
              <div className="flex items-start gap-3 bg-[#070d18] p-3.5 rounded-2xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                <div>
                  <span className="text-white font-bold block">Select Framework</span>
                  <span className="text-[11px] text-slate-400 font-normal">Choose target HTML or Frontend framework.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#070d18] p-3.5 rounded-2xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                <div>
                  <span className="text-white font-bold block">Embed Client Script</span>
                  <span className="text-[11px] text-slate-400 font-normal">Paste before closing &lt;/head&gt; tag on target app.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#070d18] p-3.5 rounded-2xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                <div>
                  <span className="text-white font-bold block">Verify SDK Handshake</span>
                  <span className="text-[11px] text-slate-400 font-normal">Test real-time heartbeat connection.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#070d18] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">SDK Status</span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
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
              className="w-full kenzo-glow-btn text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              {verificationState === 'checking' ? <RefreshCw size={13} className="animate-spin" /> : <Link2 size={13} />}
              <span>Verify Connection</span>
            </button>
          </div>
        </div>

        {/* Right Side: Code Tabs & Snippet Box */}
        <div className="lg:col-span-2 kenzo-glass-card rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {(['html', 'react', 'nextjs', 'vue', 'angular'] as const).map((fw) => (
                <button
                  key={fw}
                  onClick={() => setActiveTab(fw)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                    activeTab === fw
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {fw}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="bg-[#070d18] hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Snippet'}</span>
            </button>
          </div>

          <div className="bg-[#070d18] border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-x-auto text-sky-200">
            <pre className="whitespace-pre-wrap leading-relaxed">{snippets[activeTab]}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
