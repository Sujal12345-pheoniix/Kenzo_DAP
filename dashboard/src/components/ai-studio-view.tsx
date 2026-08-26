import { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Layers, 
  MessageSquare, 
  Tag, 
  TestTube, 
  CheckCircle, 
  Copy, 
  Plus, 
  RefreshCw,
  Lightbulb,
  Sliders,
  Code2
} from 'lucide-react';

interface AIStudioViewProps {
  apiKey: string;
  projectId: string;
  onDeployFlow?: (flowData: any) => void;
}

interface GeneratedStep {
  title: string;
  content: string;
  selector: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export default function AIStudioView({ apiKey, onDeployFlow }: AIStudioViewProps) {
  const [prompt, setPrompt] = useState('');
  const [guidanceType, setGuidanceType] = useState<'tour' | 'modal' | 'tip' | 'survey'>('tour');
  const [targetAudience, setTargetAudience] = useState<'new_users' | 'power_users' | 'all'>('new_users');
  const [tone, setTone] = useState<'friendly' | 'professional' | 'concise'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFlow, setGeneratedFlow] = useState<{
    name: string;
    description: string;
    targetRoute: string;
    steps: GeneratedStep[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const PRESETS = [
    {
      label: '4-Step SaaS Onboarding Tour',
      type: 'tour' as const,
      prompt: 'Create a smooth 4-step onboarding tour introducing new enterprise users to the primary navigation, analytics cockpit, filter controls, and report export feature.',
    },
    {
      label: 'New Feature Release Modal',
      type: 'modal' as const,
      prompt: 'Draft an engaging quarterly feature announcement popup for our new AI telemetry dashboard with bulleted highlights and a direct Call to Action.',
    },
    {
      label: 'CRM Smart Tip Helper',
      type: 'tip' as const,
      prompt: 'Generate contextual smart tips for complex financial report forms to reduce input errors on the tax calculation input field.',
    },
    {
      label: 'NPS Post-Checkout Survey',
      type: 'survey' as const,
      prompt: 'Create a friendly 0-10 Net Promoter Score survey asking users how likely they are to recommend the platform after completing their first project.',
    },
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setDeployed(false);

    setTimeout(() => {
      if (guidanceType === 'tour') {
        setGeneratedFlow({
          name: 'Interactive Platform Walkthrough',
          description: 'AI-generated guided tour tailored for ' + targetAudience.replace('_', ' '),
          targetRoute: '/dashboard',
          steps: [
            {
              title: 'Welcome to your Workspace',
              content: 'Get a bird-eye view of all your telemetry and active guidance flows right here in the main cockpit.',
              selector: '#overview-header',
              placement: 'bottom',
            },
            {
              title: 'Interactive Guidance Suite',
              content: 'Build, configure, and monitor product tours, popups, and hotspot beacons without coding.',
              selector: '#sidebar-guidance',
              placement: 'right',
            },
            {
              title: 'Real-Time Telemetry Stream',
              content: 'Track every user interaction, milestone completion, and drop-off rate as it happens.',
              selector: '#analytics-stream',
              placement: 'left',
            },
            {
              title: 'Instant SDK Integration',
              content: 'Embed a single script tag into your client application to activate instant zero-latency guidance.',
              selector: '#sdk-snippet-box',
              placement: 'top',
            },
          ],
        });
      } else if (guidanceType === 'modal') {
        setGeneratedFlow({
          name: 'Feature Announcement Modal',
          description: 'High-impact release announcement modal',
          targetRoute: '/dashboard/updates',
          steps: [
            {
              title: 'Introducing Kenzo AI Copilot 2.0',
              content: 'Experience automated walkthrough generation, real-time funnel diagnosis, and smart telemetry insights designed for high-growth enterprise teams.',
              selector: 'body',
              placement: 'center',
            },
          ],
        });
      } else if (guidanceType === 'tip') {
        setGeneratedFlow({
          name: 'Contextual Form Assistant',
          description: 'Interactive smart tip badge and tooltip',
          targetRoute: '/settings/billing',
          steps: [
            {
              title: 'Tax Identifier Requirement',
              content: 'Enter your 9-digit corporate EIN or VAT registration number for compliant automated invoicing.',
              selector: '#tax-id-input',
              placement: 'right',
            },
          ],
        });
      } else {
        setGeneratedFlow({
          name: 'Quarterly User Sentiment Survey',
          description: 'Micro-survey feedback loop',
          targetRoute: '/*',
          steps: [
            {
              title: 'How likely are you to recommend Kenzo_DAP?',
              content: 'Select a score from 0 (Not likely) to 10 (Extremely likely). Your feedback directly shapes our product roadmap.',
              selector: 'body',
              placement: 'bottom',
            },
          ],
        });
      }
      setIsGenerating(false);
    }, 1000);
  };

  const handleCopyJson = () => {
    if (!generatedFlow) return;
    navigator.clipboard.writeText(JSON.stringify(generatedFlow, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeploy = () => {
    setDeployed(true);
    if (onDeployFlow && generatedFlow) {
      onDeployFlow(generatedFlow);
    }
  };

  return (
    <div className="space-y-6 select-none text-left w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">AI Studio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Generate walkthroughs and guidance flows</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono bg-[#080e1a] border border-slate-800 px-2.5 py-1 rounded">
            API: {apiKey ? `${apiKey.slice(0, 10)}...` : 'Connected'}
          </span>
        </div>
      </div>

      {/* Preset Quick Actions */}
      <div>
        <span className="text-[11px] font-semibold text-slate-400 block mb-2">Presets</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setGuidanceType(preset.type);
                setPrompt(preset.prompt);
              }}
              className="bg-[#0C1322] border border-slate-800 hover:border-sky-500/40 p-3 rounded-lg text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Lightbulb size={11} />
                </div>
                <span className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">{preset.label}</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{preset.prompt}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-[#0C1322] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={13} className="text-sky-400" />
              <span>Configuration</span>
            </h3>
            <span className="text-[11px] text-slate-400">Step 1 of 2</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Output Format</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'tour' as const, label: 'Product Tour', icon: Layers },
                { type: 'modal' as const, label: 'Popup Modal', icon: MessageSquare },
                { type: 'tip' as const, label: 'Smart Tip', icon: Tag },
                { type: 'survey' as const, label: 'Micro Survey', icon: TestTube },
              ].map(item => {
                const Icon = item.icon;
                const isSelected = guidanceType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setGuidanceType(item.type)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/50 text-white font-semibold'
                        : 'bg-[#080e1a] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon size={13} className={isSelected ? 'text-sky-400' : 'text-slate-500'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Target Audience</label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value as any)}
                className="kenzo-input w-full text-xs"
              >
                <option value="new_users">New Users</option>
                <option value="power_users">Power Users</option>
                <option value="all">All Visitors</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Copy Tone</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value as any)}
                className="kenzo-input w-full text-xs"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly & Warm</option>
                <option value="concise">Concise & Direct</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Instructions & Feature Context</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the page, the user objective, and what key UI elements or actions should be highlighted..."
              className="kenzo-input w-full text-xs placeholder-slate-500 leading-relaxed resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="kenzo-btn-primary w-full justify-center py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Synthesizing Steps & Selectors...</span>
              </>
            ) : (
              <>
                <Wand2 size={13} />
                <span>Generate Guidance Flow</span>
              </>
            )}
          </button>
        </div>

        <div className="lg:col-span-7 bg-[#0C1322] border border-slate-800 rounded-lg p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 size={13} className="text-sky-400" />
                  <span>Output</span>
                </h3>
                {generatedFlow && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                    {generatedFlow.steps.length} steps generated
                  </span>
                )}
              </div>

              {generatedFlow && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="kenzo-btn-secondary text-xs"
                  >
                    {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'JSON'}</span>
                  </button>
                </div>
              )}
            </div>

            {!generatedFlow && !isGenerating && (
              <div className="py-20 text-center flex flex-col items-center gap-2.5 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <Sparkles size={22} />
                </div>
                <h4 className="text-xs font-semibold text-white">No Flow Generated Yet</h4>
                <p className="text-xs text-slate-400 text-center">
                  Select a workflow preset or describe your requirements on the left to generate complete, production-ready step definitions.
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <RefreshCw size={24} className="text-sky-400 animate-spin" />
                <span className="text-xs text-slate-300 font-medium">Generating...</span>
              </div>
            )}

            {generatedFlow && !isGenerating && (
              <div className="space-y-3">
                <div className="bg-[#080e1a] border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{generatedFlow.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{generatedFlow.description}</p>
                  </div>
                  <span className="text-[10px] font-mono bg-[#0C1322] border border-slate-700 text-sky-300 px-2 py-0.5 rounded">
                    {generatedFlow.targetRoute}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {generatedFlow.steps.map((step, sIdx) => (
                    <div key={sIdx} className="bg-[#080e1a] border border-slate-800 p-3.5 rounded-lg text-xs space-y-1.5 group hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-md bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {sIdx + 1}
                          </span>
                          <span className="font-semibold text-white">{step.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400 bg-[#0C1322] px-1.5 py-0.5 rounded border border-slate-800">
                            {step.placement}
                          </span>
                          <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                            {step.selector}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-300 text-xs pl-6 leading-relaxed">
                        {step.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {generatedFlow && !isGenerating && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Ready to publish to workspace tenant.
              </span>
              <button
                onClick={handleDeploy}
                disabled={deployed}
                className="kenzo-btn-primary text-xs"
              >
                {deployed ? (
                  <>
                    <CheckCircle size={13} className="text-emerald-300" />
                    <span>Saved to Workspace</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    <span>Deploy Flow Directly</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
