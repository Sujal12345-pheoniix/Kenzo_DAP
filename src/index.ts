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

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Kenzo = Kenzo;
}

export default Kenzo;
export { Kenzo, KenzoSDK };
