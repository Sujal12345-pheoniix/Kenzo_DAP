/**
 * Service interfaces — every module implements one of these contracts.
 * Enables dependency injection, mocking, and module replacement.
 * @module core/interfaces
 */

import type {
  AnalyticsEvent,
  ApiRequestOptions,
  AuthResponse,
  ElementSelector,
  Flow,
  FlowProgress,
  FlowStep,
  KenzoConfig,
  KenzoInitOptions,
  LogLevel,
  ResolvedElement,
  SdkState,
  SpotlightRect,
  TooltipRenderOptions,
  UserIdentity,
} from '@/types';

/** Structured logger contract. */
export interface ILogger {
  setLevel(level: LogLevel): void;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

/** Configuration manager contract. */
export interface IConfigService {
  init(options: KenzoInitOptions): KenzoConfig;
  get(): KenzoConfig;
  update(partial: Partial<KenzoInitOptions>): KenzoConfig;
  isReady(): boolean;
}

/** Project authentication contract. */
export interface IAuthService {
  authenticate(apiKey: string): Promise<AuthResponse>;
  getToken(): string | null;
  isAuthenticated(): boolean;
  refresh(): Promise<void>;
  clear(): void;
}

/** Typed event bus contract. */
export interface IEventBus {
  on<K extends keyof import('@/types').KenzoEventMap>(
    event: K,
    handler: (payload: import('@/types').KenzoEventMap[K]) => void,
  ): () => void;
  once<K extends keyof import('@/types').KenzoEventMap>(
    event: K,
    handler: (payload: import('@/types').KenzoEventMap[K]) => void,
  ): () => void;
  emit<K extends keyof import('@/types').KenzoEventMap>(
    event: K,
    payload: import('@/types').KenzoEventMap[K],
  ): void;
  off<K extends keyof import('@/types').KenzoEventMap>(
    event: K,
    handler: (payload: import('@/types').KenzoEventMap[K]) => void,
  ): void;
  clear(): void;
}

/** REST API client contract. */
export interface IApiClient {
  get<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
  setAuthToken(token: string): void;
  clearAuthToken(): void;
  clearCache(path?: string): void;
}

/** Storage abstraction contract. */
export interface IStorageService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  remove(key: string): void;
  clear(prefix?: string): void;
  has(key: string): boolean;
}

/** Session storage contract. */
export interface ISessionStorage {
  getSessionId(): string;
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

/** DOM element resolver contract. */
export interface IElementResolver {
  resolve(selector: ElementSelector, options?: { retries?: number; interval?: number }): Promise<ResolvedElement | null>;
  resolveSync(selector: ElementSelector): ResolvedElement | null;
  waitForElement(selector: ElementSelector, timeout?: number): Promise<ResolvedElement>;
}

/** CSS/XPath selector engine contract. */
export interface ISelectorEngine {
  query(selector: ElementSelector): Element[];
  queryOne(selector: ElementSelector): Element | null;
  isValid(selector: ElementSelector): boolean;
}

/** DOM visibility checker contract. */
export interface IVisibilityChecker {
  isVisible(element: Element): boolean;
  isInViewport(element: Element, threshold?: number): boolean;
  getEffectiveOpacity(element: Element): number;
}

/** DOM mutation observer contract. */
export interface IDomMutationObserver {
  start(callback: () => void): void;
  stop(): void;
  isRunning(): boolean;
}

/** DOM scanner contract. */
export interface IDomScanner {
  scan(): void;
  onScan(callback: () => void): () => void;
}

/** SPA navigation watcher contract. */
export interface INavigationWatcher {
  start(): void;
  stop(): void;
  getCurrentUrl(): string;
  onNavigate(callback: (url: string) => void): () => void;
}

/** Z-index manager contract. */
export interface IZIndexManager {
  allocate(): number;
  release(id: number): void;
  getBase(): number;
  reset(): void;
}

/** Overlay backdrop contract. */
export interface IBackdrop {
  show(options?: { opacity?: number; color?: string }): void;
  hide(): void;
  isVisible(): boolean;
  destroy(): void;
}

/** Spotlight cutout contract. */
export interface ISpotlight {
  show(rect: SpotlightRect, padding?: number): void;
  hide(): void;
  update(rect: SpotlightRect, padding?: number): void;
  destroy(): void;
}

/** Mask layer (SVG clip-path) contract. */
export interface IMaskLayer {
  show(rect: SpotlightRect, padding?: number): void;
  hide(): void;
  update(rect: SpotlightRect, padding?: number): void;
  destroy(): void;
}

/** Overlay orchestrator contract. */
export interface IOverlayManager {
  showSpotlight(element: Element, options?: { padding?: number; blockInteraction?: boolean }): void;
  showHighlight(element: Element): void;
  hide(): void;
  destroy(): void;
}

/** Tooltip positioning contract. */
export interface ITooltipPositioner {
  position(tooltipEl: HTMLElement, referenceEl: Element, placement: string): Promise<void>;
  destroy(): void;
}

/** Tooltip renderer contract. */
export interface ITooltipRenderer {
  render(options: TooltipRenderOptions, referenceEl: Element): HTMLElement;
  update(options: TooltipRenderOptions): void;
  destroy(): void;
  getElement(): HTMLElement | null;
}

/** Tooltip animation contract. */
export interface ITooltipAnimator {
  enter(element: HTMLElement): Promise<void>;
  exit(element: HTMLElement): Promise<void>;
}

/** Flow loader contract. */
export interface IFlowLoader {
  loadAll(forceRefresh?: boolean): Promise<Flow[]>;
  loadById(flowId: string): Promise<Flow | null>;
  getCached(flowId: string): Flow | null;
  invalidate(): void;
}

/** Flow progress manager contract. */
export interface IProgressManager {
  getProgress(flowId: string): FlowProgress | null;
  saveProgress(progress: FlowProgress): void;
  markStepCompleted(flowId: string, stepId: string): void;
  markFlowCompleted(flowId: string): void;
  markFlowDismissed(flowId: string): void;
  reset(flowId: string): void;
}

/** Step engine contract. */
export interface IStepEngine {
  getCurrentStep(): FlowStep | null;
  getCurrentIndex(): number;
  goToStep(index: number): Promise<void>;
  refreshCurrentStep(): Promise<void>;
  next(): Promise<boolean>;
  previous(): Promise<boolean>;
  canGoNext(): boolean;
  canGoPrevious(): boolean;
  teardown(): Promise<void>;
}

/** Flow runner contract. */
export interface IFlowRunner {
  start(flow: Flow, startIndex?: number): Promise<void>;
  stop(): void;
  isRunning(): boolean;
  getActiveFlowId(): string | null;
}

/** Analytics tracker contract. */
export interface IAnalyticsTracker {
  track(event: AnalyticsEvent): void;
  trackCustom(name: string, properties?: Record<string, string | number | boolean>): void;
  flush(): Promise<void>;
  setUser(identity: UserIdentity): void;
  destroy(): void;
}

/** Session tracker contract. */
export interface ISessionTracker {
  getSessionId(): string;
  getSessionStart(): string;
  renew(): void;
}

/** SDK lifecycle manager contract. */
export interface ILifecycleManager {
  getState(): SdkState;
  initialize(options: import('@/types').KenzoInitOptions): Promise<void>;
  destroy(): void;
  reload(): Promise<void>;
}

/** Error boundary contract. */
export interface IErrorBoundary {
  wrap<T>(fn: () => T, context: string): T;
  wrapAsync<T>(fn: () => Promise<T>, context: string): Promise<T>;
  onError(handler: (error: Error, context: string) => void): () => void;
}

/** Version manager contract. */
export interface IVersionManager {
  getVersion(): string;
  getBuildTime(): string;
}

/** Dependency injection container contract. */
export interface IContainer {
  register<T>(token: symbol, factory: () => T): void;
  registerSingleton<T>(token: symbol, factory: () => T): void;
  resolve<T>(token: symbol): T;
  has(token: symbol): boolean;
  clear(): void;
}

/** Condition evaluator contract. */
export interface IConditionEvaluator {
  evaluateUrlRules(rules: import('@/types').UrlRule[]): boolean;
  evaluateConditions(conditions: import('@/types').DisplayCondition[]): boolean;
}

/** Content sanitizer contract. */
export interface IContentSanitizer {
  sanitizeHtml(html: string): string;
  escapeText(text: string): string;
}
