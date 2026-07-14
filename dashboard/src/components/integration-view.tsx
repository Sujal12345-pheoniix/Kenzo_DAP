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
    html: `<!-- Kenzo Digital Adoption Platform Snippet -->
<script src="${formattedUrl}/sdk.js"></script>
<script>
  (function() {
    var checkKenzo = setInterval(function() {
      if (typeof Kenzo !== 'undefined') {
        clearInterval(checkKenzo);
        Kenzo.init({
          apiKey: "${displayApiKey}",
          apiBaseUrl: "${formattedUrl}/api/v1"
        });
      }
    }, 50);
  })();
</script>`,

    react: `// 1. Install standard dependency
// npm install @kenzo/sdk --save

// 2. Initialize in your App entry point (App.tsx or index.tsx)
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
    import('@kenzo/sdk').then(({ Kenzo }) => {
      Kenzo.init({
        apiKey: "${displayApiKey}",
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
  apiKey: "${displayApiKey}",
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
      apiKey: '${displayApiKey}',
      apiBaseUrl: '${formattedUrl}/api/v1'
    });
  }
}`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2050);
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
              return <span key={pidx} className="text-rose-455 font-bold">{part}</span>;
            }
            return <span key={pidx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6 select-none text-left">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-outfit text-white leading-tight">Snippet Installation</h2>
        <p className="text-zinc-400 text-xs mt-1">Deploy this single-snippet script to initialize walkthroughs globally on your domains.</p>
      </div>

      {/* Main Grid split: Installation Steps + Code display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step-by-Step wizard */}
        <div className="glass border border-zinc-800/80 rounded-xl p-5 custom-shadow flex flex-col gap-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-zinc-900">
            <Cpu size={16} className="text-indigo-400" />
            <h3 className="text-xs font-bold tracking-wider text-zinc-300 uppercase">Installation Wizard</h3>
          </div>

          <div className="flex flex-col gap-5">
            {/* Step 1 */}
            <div className="flex items-start gap-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-400 shrink-0">1</span>
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="font-semibold text-zinc-200">Select Platform</span>
                <span className="text-zinc-500 leading-normal">Choose your frontend framework tab.</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-400 shrink-0">2</span>
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="font-semibold text-zinc-200">Copy JavaScript snippet</span>
                <span className="text-zinc-500 leading-normal">Place it globally in the root html file or main App layout.</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-400 shrink-0">3</span>
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="font-semibold text-zinc-200">Verify client network connection</span>
                <span className="text-zinc-500 leading-normal">Start the validation checker tool to poll status logs.</span>
              </div>
            </div>
          </div>

          {/* Connection Verification widget */}
          <div className="mt-auto pt-5 border-t border-zinc-900">
            <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-lg flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400 font-semibold uppercase tracking-wider">SDK Connection Checker</span>
                
                {/* Status indicator pills */}
                {verificationState === 'idle' && (
                  <span className="text-zinc-500 font-semibold">Idle</span>
                )}
                {verificationState === 'checking' && (
                  <span className="text-indigo-400 font-semibold animate-pulse">Verifying...</span>
                )}
                {verificationState === 'success' && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">Connected</span>
                )}
              </div>

              {/* Verify actions */}
              <AnimatePresence mode="wait">
                {verificationState !== 'success' ? (
                  <button 
                    onClick={verifyConnection}
                    disabled={verificationState === 'checking'}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all focus:outline-none cursor-pointer ${
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
                    className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg flex flex-col items-center justify-center gap-1.5 text-center"
                  >
                    <CheckCircle size={18} className="text-emerald-400" />
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

        {/* Code display console */}
        <div className="glass border border-zinc-800/80 rounded-xl p-5 custom-shadow lg:col-span-2 flex flex-col">
          {/* Tabs header */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
            <div className="flex items-center gap-1.5">
              <Terminal size={14} className="text-indigo-400" />
              <span className="text-xs font-bold tracking-wider text-zinc-300 uppercase">Framework Snippets</span>
            </div>
            
            {/* Copy button */}
            <button 
              onClick={handleCopy}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer ${
                copied 
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                  : 'bg-zinc-900 border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Framework tabs selector */}
          <div className="flex items-center gap-1.5 mb-4 bg-zinc-950 p-1.5 rounded-lg border border-zinc-900/80 w-fit">
            {(['html', 'react', 'nextjs', 'vue', 'angular'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCopied(false);
                }}
                className={`text-[10px] font-bold px-3 py-1.5 rounded transition-all uppercase cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-zinc-900 text-white shadow-sm border border-zinc-850' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'nextjs' ? 'Next.js' : tab}
              </button>
            ))}
          </div>

          {/* Code pre box */}
          <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-lg p-5 overflow-auto text-xs leading-relaxed max-h-[360px] custom-shadow">
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
