/**
 * Kenzo SDK — shared domain types.
 * @module types
 */

/** SDK initialization options passed to Kenzo.init(). */
export interface KenzoInitOptions {
  /** Project API key issued by Kenzo dashboard. */
  apiKey: string;
  /** Override backend base URL (defaults to production). */
  apiBaseUrl?: string;
  /** Enable debug logging. */
  debug?: boolean;
  /** User identity for analytics segmentation. */
  userId?: string;
  /** Arbitrary user traits for targeting rules. */
  userTraits?: Record<string, string | number | boolean>;
  /** Locale for content rendering (ISO 639-1). */
  locale?: string;
  /** Force dark mode tooltip theme. */
  darkMode?: boolean;
  /** Disable analytics event collection. */
  disableAnalytics?: boolean;
  /** Custom z-index base for overlays. */
  zIndexBase?: number;
  /** Max retries when waiting for DOM elements. */
  elementWaitRetries?: number;
  /** Interval between element wait retries (ms). */
  elementWaitInterval?: number;
}

/** Resolved SDK configuration after merge with defaults. */
export interface KenzoConfig extends Required<
  Pick<
    KenzoInitOptions,
    'apiKey' | 'debug' | 'locale' | 'darkMode' | 'disableAnalytics' | 'zIndexBase'
  >
> {
  apiBaseUrl: string;
  userId?: string;
  userTraits: Record<string, string | number | boolean>;
  elementWaitRetries: number;
  elementWaitInterval: number;
}

/** Flow display mode. */
export type FlowDisplayMode = 'spotlight' | 'highlight' | 'tooltip' | 'modal';

/** Step navigation action. */
export type StepAction = 'next' | 'previous' | 'skip' | 'finish' | 'close';

/** Tooltip placement preference. */
export type TooltipPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'auto';

/** URL match rule for conditional flow display. */
export interface UrlRule {
  /** Match type: exact, contains, regex, or startsWith. */
  type: 'exact' | 'contains' | 'regex' | 'startsWith';
  /** Pattern to match against window.location.href or pathname. */
  pattern: string;
  /** Whether to match pathname only (default) or full href. */
  matchFullUrl?: boolean;
}

/** Conditional display rule evaluated before showing a flow/step. */
export interface DisplayCondition {
  /** Field to evaluate (url, trait, custom). */
  field: 'url' | 'trait' | 'custom';
  /** Operator for comparison. */
  operator: 'equals' | 'not_equals' | 'contains' | 'regex' | 'exists' | 'not_exists';
  /** Value to compare against. */
  value?: string | number | boolean;
  /** Trait key when field is 'trait'. */
  traitKey?: string;
}

/** Element selector definition supporting multiple strategies. */
export interface ElementSelector {
  /** CSS selector string. */
  css?: string;
  /** XPath expression. */
  xpath?: string;
  /** Text content match. */
  text?: string;
  /** ARIA label match. */
  ariaLabel?: string;
  /** data-* attribute selector. */
  dataAttribute?: { key: string; value?: string };
  /** Index when multiple elements match (0-based). */
  index?: number;
}

/** Button configuration on a step tooltip. */
export interface StepButton {
  label: string;
  action: StepAction;
  primary?: boolean;
}

/** Single step within a flow. */
export interface FlowStep {
  id: string;
  order: number;
  title: string;
  content: string;
  selector: ElementSelector;
  placement?: TooltipPlacement;
  displayMode?: FlowDisplayMode;
  buttons?: StepButton[];
  /** Auto-advance after delay (ms). 0 = disabled. */
  autoAdvanceDelay?: number;
  /** Scroll element into view before showing. */
  autoScroll?: boolean;
  /** Conditions that must pass to show this step. */
  conditions?: DisplayCondition[];
  /** Custom CSS class for tooltip. */
  cssClass?: string;
  /** Whether backdrop blocks interaction with page. */
  blockInteraction?: boolean;
  /** Padding around spotlight cutout (px). */
  spotlightPadding?: number;
}

/** Published flow definition from backend. */
export interface Flow {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  steps: FlowStep[];
  urlRules?: UrlRule[];
  conditions?: DisplayCondition[];
  /** Priority when multiple flows match (higher = first). */
  priority?: number;
  /** Tags for programmatic filtering. */
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/** Flow progress persisted per user/session. */
export interface FlowProgress {
  flowId: string;
  currentStepIndex: number;
  completedStepIds: string[];
  startedAt: string;
  lastViewedAt: string;
  completed: boolean;
  dismissed: boolean;
}

/** Analytics event types. */
export type AnalyticsEventType =
  | 'flow_started'
  | 'flow_completed'
  | 'flow_dismissed'
  | 'step_viewed'
  | 'step_clicked'
  | 'step_hovered'
  | 'button_clicked'
  | 'error'
  | 'sdk_initialized'
  | 'custom';

/** Analytics event payload. */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  flowId?: string;
  stepId?: string;
  sessionId: string;
  timestamp: string;
  properties?: Record<string, string | number | boolean>;
  url: string;
  userAgent: string;
}

/** User identity for analytics. */
export interface UserIdentity {
  userId: string;
  traits: Record<string, string | number | boolean>;
}

/** API authentication response. */
export interface AuthResponse {
  token: string;
  projectId: string;
  expiresAt: string;
  features: string[];
}

/** Flows list API response. */
export interface FlowsResponse {
  flows: Flow[];
  etag?: string;
}

/** SDK lifecycle state. */
export type SdkState = 'uninitialized' | 'initializing' | 'ready' | 'destroyed' | 'error';

/** Public SDK API surface. */
export interface KenzoPublicAPI {
  init(options: KenzoInitOptions): Promise<void>;
  startFlow(flowId: string): Promise<void>;
  stopFlow(): void;
  track(eventName: string, properties?: Record<string, string | number | boolean>): void;
  identify(userId: string, traits?: Record<string, string | number | boolean>): void;
  destroy(): void;
  reload(): Promise<void>;
  version(): string;
}

/** Internal event bus event map. */
export interface KenzoEventMap {
  'sdk:initialized': void;
  'sdk:destroyed': void;
  'sdk:error': Error;
  'flow:started': { flowId: string };
  'flow:completed': { flowId: string };
  'flow:dismissed': { flowId: string };
  'flow:stopped': { flowId: string };
  'step:viewed': { flowId: string; stepId: string; stepIndex: number };
  'step:changed': { flowId: string; stepId: string; stepIndex: number };
  'navigation:changed': { url: string };
  'dom:element:found': { selector: ElementSelector; element: Element };
  'dom:element:not_found': { selector: ElementSelector };
  'analytics:event': AnalyticsEvent;
}

/** Logger severity levels. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** HTTP methods supported by API client. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** API request options. */
export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTtl?: number;
}

/** API error with status code. */
export interface ApiError extends Error {
  status?: number;
  code?: string;
  retryable: boolean;
}

/** Resolved element with metadata. */
export interface ResolvedElement {
  element: Element;
  rect: DOMRect;
  visible: boolean;
  selector: ElementSelector;
}

/** Overlay spotlight geometry. */
export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius?: number;
}

/** Tooltip render options. */
export interface TooltipRenderOptions {
  step: FlowStep;
  flowId: string;
  stepIndex: number;
  totalSteps: number;
  darkMode: boolean;
  onAction: (action: StepAction) => void;
}

/** Lazy module loader result. */
export type LazyModule<T> = () => Promise<T>;
