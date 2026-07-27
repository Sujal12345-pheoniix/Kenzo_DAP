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

  const script = (document.currentScript as HTMLScriptElement | null) ||
    document.querySelector<HTMLScriptElement>('script[data-kenzo-key]') ||
    document.querySelector<HTMLScriptElement>('script[data-api-key]') ||
    document.querySelector<HTMLScriptElement>('script[src*="sdk.js"]');

  if (!script) return;

  const apiKey = script.getAttribute('data-kenzo-key') ||
    script.getAttribute('data-api-key') ||
    script.getAttribute('data-key');

  if (!apiKey) return;

  const apiBaseUrl = script.getAttribute('data-api-base') ||
    script.getAttribute('data-api-url') ||
    '/api/v1';

  const debug = script.getAttribute('data-debug') === 'true';
  const environment = script.getAttribute('data-environment') || 'production';
  const darkMode = script.getAttribute('data-dark-mode') !== 'false';

  const run = () => {
    sdk.init({
      apiKey,
      apiBaseUrl,
      debug,
      darkMode,
      userTraits: { environment }
    }).catch(err => {
      if (debug) {
        console.warn('[Kenzo SDK] Auto-bootstrap error:', err);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Kenzo = Kenzo;
  autoBootstrap();
}

export default Kenzo;
export { Kenzo, KenzoSDK };

