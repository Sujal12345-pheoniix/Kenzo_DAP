/**
 * Kenzo DAP SDK — public entry point.
 *
 * Usage (script tag):
 *   <script src="https://cdn.kenzo.ai/sdk.js"></script>
 *   <script>
 *     Kenzo.init({ apiKey: 'your-api-key' });
 *   </script>
 *
 * Usage (ES module):
 *   import Kenzo from '@kenzo/sdk';
 *   await Kenzo.init({ apiKey: 'your-api-key' });
 *
 * @packageDocumentation
 */

import { KenzoSDK } from '@/sdk';
import type { KenzoPublicAPI } from '@/types';

export type {
  AnalyticsEvent,
  AnalyticsEventType,
  DisplayCondition,
  ElementSelector,
  Flow,
  FlowDisplayMode,
  FlowProgress,
  FlowStep,
  KenzoConfig,
  KenzoInitOptions,
  KenzoPublicAPI,
  StepAction,
  StepButton,
  TooltipPlacement,
  UrlRule,
  UserIdentity,
} from '@/types';

const sdk = new KenzoSDK();

/**
 * Global Kenzo namespace — attached to window when loaded via script tag.
 */
const Kenzo: KenzoPublicAPI = {
  init: (options) => sdk.init(options),
  startFlow: (flowId) => sdk.startFlow(flowId),
  stopFlow: () => sdk.stopFlow(),
  track: (eventName, properties) => sdk.track(eventName, properties),
  identify: (userId, traits) => sdk.identify(userId, traits),
  destroy: () => sdk.destroy(),
  reload: () => sdk.reload(),
  version: () => sdk.version(),
};

/**
 * Automatic snippet bootstrapper.
 * Inspects document.currentScript and DOM for <script data-kenzo-key="...">
 */
function autoBootstrap(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const scripts = Array.from(document.getElementsByTagName('script'));
  const script = (document.currentScript as HTMLScriptElement | null) ||
    scripts.find(s => s.hasAttribute('data-kenzo-key') || s.hasAttribute('data-api-key') || (s.dataset && (s.dataset.kenzoKey || s.dataset.apiKey))) ||
    scripts.find(s => s.src && s.src.includes('sdk.js'));

  let apiKey = script ? (
    script.getAttribute('data-kenzo-key') ||
    script.getAttribute('data-api-key') ||
    script.getAttribute('data-key') ||
    (script.dataset ? script.dataset.kenzoKey || script.dataset.apiKey || script.dataset.key : null)
  ) : null;

  // Domain-based auto-detection fallback for TruthBomb and Kenzo-ERP
  if (!apiKey) {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('truth-bomb') || host.includes('truthbomb')) {
      apiKey = 'kenzo_project_dev_api_key_2026';
    } else if (host.includes('kenzo-one-erp') || host.includes('one-erp') || host.includes('erp') || host.includes('vercel')) {
      apiKey = 'kenzo_project_1785139787760_key_u1yaq';
    }
  }

  if (!apiKey) return;

  let defaultApiBase = 'https://kenzo-dap.onrender.com/api/v1';
  if (script && script.src) {
    try {
      const scriptUrl = new URL(script.src, window.location.href);
      defaultApiBase = `${scriptUrl.origin}/api/v1`;
    } catch (_) {}
  }

  const apiBaseUrl = (script && (script.getAttribute('data-api-base') || script.getAttribute('data-api-url'))) ||
    defaultApiBase;

  const run = () => {
    sdk.init({
      apiKey: apiKey!,
      apiBaseUrl,
      debug: true,
      darkMode: true,
      userTraits: { environment: 'production' }
    }).catch(err => {
      console.warn('[Kenzo SDK] Auto-bootstrap notice:', err);
    });
  };

  run();
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Kenzo = Kenzo;
  autoBootstrap();
}

export default Kenzo;
export { Kenzo, KenzoSDK };

