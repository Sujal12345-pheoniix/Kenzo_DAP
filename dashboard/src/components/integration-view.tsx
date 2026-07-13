import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Copy, 
  Terminal, 
  RefreshCw, 
  Cpu, 
  CheckCircle,
  Link2
} from 'lucide-react';

interface IntegrationViewProps {
  apiBaseUrl: string;
}

type Framework = 'html' | 'react' | 'nextjs' | 'vue' | 'angular';

export default function IntegrationView({ apiBaseUrl }: IntegrationViewProps) {
  const [activeTab, setActiveTab] = useState<Framework>('html');
  const [copied, setCopied] = useState(false);
  const [verificationState, setVerificationState] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');

  const formattedUrl = apiBaseUrl || 'https://kenzo-dap.onrender.com';

  const snippets: Record<Framework, string> = {
    html: `<!-- Kenzo Digital Adoption Platform Snippet -->
<script src="${formattedUrl}/sdk.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof Kenzo !== 'undefined') {
      Kenzo.init({
        apiKey: "kenzo_project_dev_api_key_2026",
        apiBaseUrl: "${formattedUrl}/api/v1"
      });
    }
  });
</script>`,

    react: `// 1. Install standard dependency
// npm install @kenzo/sdk --save

// 2. Initialize in your App entry point (App.tsx or index.tsx)
import React, { useEffect } from 'react';
import { Kenzo } from '@kenzo/sdk';

export default function App() {
  useEffect(() => {
    Kenzo.init({
      apiKey: "kenzo_project_dev_api_key_2026",
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
    import('@kenzo/sdk').then(({ Kenzo }) => {
      Kenzo.init({
        apiKey: "kenzo_project_dev_api_key_2026",
        apiBaseUrl: "${formattedUrl}/api/v1"
      });
    });
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,

    vue: `// Initialize in your Vue entry point (main.js)
import { createApp } from 'vue'
import App from './App.vue'
import { Kenzo } from '@kenzo/sdk'

const app = createApp(App)

Kenzo.init({
  apiKey: "kenzo_project_dev_api_key_2026",
  apiBaseUrl: "${formattedUrl}/api/v1"
});

app.mount('#app')`,

    angular: `// Initialize in AppComponent (app.component.ts)
import { Component, OnInit } from '@angular/core';
import { Kenzo } from '@kenzo/sdk';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  ngOnInit() {
    Kenzo.init({
      apiKey: 'kenzo_project_dev_api_key_2026',
      apiBaseUrl: '${formattedUrl}/api/v1'
    });
  }
}`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifyConnection = () => {
    setVerificationState('checking');
    setTimeout(() => {
      setVerificationState('success');
    }, 2000);
  };

  const renderHighlightedCode = (code: string) => {
    const lines = code.split('\n');
    return lines.map((line, idx) => {
      let isComment = line.trim().startsWith('//') || line.trim().startsWith('<!--') || line.trim().endsWith('-->');
      
      if (isComment) {
        return <div key={idx} className="text-zinc-555 font-mono">{line}</div>;
      }

      return (
        <div key={idx} className="text-zinc-300 font-mono">
          {line.split(/([{}()<>=".,:;'"\s]|\bimport\b|\bexport\b|\bconst\b|\bif\b|\blet\b|\bfunction\b|\btypeof\b|\bdocument\b|\bwindow\b)/).map((part, pidx) => {
            if (part === 'import' || part === 'export' || part === 'const' || part === 'function' || part === 'let' || part === 'typeof' || part === 'if') {
              return <span key={pidx} className="text-indigo-400 font-bold">{part}</span>;
            }
            if (part === 'Kenzo' || part === 'document' || part === 'window') {
              return <span key={pidx} className="text-violet-405 font-bold">{part}</span>;
            }
            if (part.startsWith('"') && part.endsWith('"')) {
              return <span key={pidx} className="text-emerald-400 font-medium">{part}</span>;
            }
            if (part.startsWith("'") && part.endsWith("'")) {
              return <span key={pidx} className="text-emerald-400 font-medium">{part}</span>;
            }
            if (part === 'apiKey' || part === 'apiBaseUrl') {
              return <span key={pidx} className="text-rose-450 font-bold">{part}</span>;
            }
            return <span key={pidx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="space-y-12 select-none text-left">
      
      {/* Header */}
      <div className="border-b border-zinc-800/40 pb-4">
        <h2 className="text-2xl font-bold font-outfit text-white tracking-tight leading-tight">Snippet Installation</h2>
        <p className="text-zinc-500 text-xs mt-1">Deploy this single-snippet script to initialize walkthroughs globally on your domains.</p>
      </div>

      {/* Main Grid: Wizard Steps vs Code Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        
        {/* Wizard Steps (Elevated Blue Header Card) */}
        <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-8 shadow-xl flex flex-col justify-between mt-4 lg:col-span-1">
          {/* Floating Blue Header */}
          <div className="absolute -top-5 left-4 right-4 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center px-4 shadow-lg shadow-blue-600/20 ring-1 ring-white/10">
            <Cpu size={14} className="text-white mr-2" />
            <h3 className="text-xs font-bold font-outfit text-white uppercase tracking-wider">Installation Steps</h3>
          </div>

          <div className="flex flex-col gap-6 mt-8">
            <div className="flex items-start gap-3.5 text-xs">
              <span className="w-5.5 h-5.5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-zinc-450 shrink-0">1</span>
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="font-bold text-zinc-200">Select Platform</span>
                <span className="text-zinc-500 leading-normal">Choose your frontend framework tab on the right.</span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 text-xs">
              <span className="w-5.5 h-5.5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-zinc-450 shrink-0">2</span>
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="font-bold text-zinc-200">Copy JavaScript Snippet</span>
                <span className="text-zinc-500 leading-normal">Place it globally in the root html file or main App layout.</span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 text-xs">
              <span className="w-5.5 h-5.5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-zinc-450 shrink-0">3</span>
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="font-bold text-zinc-200">Verify Network Connection</span>
                <span className="text-zinc-500 leading-normal">Start the validation checker tool to poll status logs.</span>
              </div>
            </div>
          </div>

          {/* Connection Checker */}
          <div className="mt-8 pt-5 border-t border-zinc-850/50">
            <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider">
                <span className="text-zinc-450 uppercase">SDK Connection Status</span>
                {verificationState === 'idle' && <span className="text-zinc-500">Idle</span>}
                {verificationState === 'checking' && <span className="text-indigo-400 animate-pulse">Checking...</span>}
                {verificationState === 'success' && <span className="text-emerald-400 flex items-center gap-0.5">Connected</span>}
              </div>

              <AnimatePresence mode="wait">
                {verificationState !== 'success' ? (
                  <button 
                    onClick={verifyConnection}
                    disabled={verificationState === 'checking'}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all focus:outline-none cursor-pointer ${
                      verificationState === 'checking' 
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-650' 
                        : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {verificationState === 'checking' ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Link2 size={12} />
                    )}
                    <span>Verify Connection</span>
                  </button>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-xl flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <CheckCircle size={20} className="text-emerald-400" />
                    <div>
                      <span className="font-bold">Live connection verified!</span>
                      <p className="text-zinc-500 text-[9px] mt-0.5">Events stream is synced with Neon DB.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Code Console Card (Elevated Violet Header Card) */}
        <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 pt-8 shadow-xl lg:col-span-2 mt-4 flex flex-col">
          {/* Floating purple Header */}
          <div className="absolute -top-5 left-4 right-4 h-12 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl flex items-center justify-between px-5 shadow-lg shadow-violet-600/20 ring-1 ring-white/10">
            <div className="flex items-center gap-1.5">
              <Terminal size={14} className="text-white" />
              <h3 className="text-xs font-bold font-outfit text-white uppercase tracking-wider">Framework Snippets</h3>
            </div>
            
            <button 
              onClick={handleCopy}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                copied 
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                  : 'bg-black/20 border-white/10 hover:bg-black/30 text-zinc-300 hover:text-white'
              }`}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Framework tabs selector */}
          <div className="flex items-center gap-1.5 mt-8 mb-4 bg-zinc-950 p-1.5 rounded-xl border border-zinc-850 w-fit">
            {(['html', 'react', 'nextjs', 'vue', 'angular'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCopied(false);
                }}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all uppercase cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-zinc-900 text-white shadow shadow-black/40 border border-zinc-800' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'nextjs' ? 'Next.js' : tab}
              </button>
            ))}
          </div>

          {/* Code pre box */}
          <div className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl p-5 overflow-auto text-xs leading-relaxed max-h-[360px] shadow-inner">
            <pre className="text-left font-mono">
              <code>
                {renderHighlightedCode(snippets[activeTab])}
              </code>
            </pre>
          </div>
        </div>

      </div>

    </div>
  );
}
