/**
 * Dependency injection tokens — symbols for service registration.
 * @module core/tokens
 */

export const TOKENS = {
  Logger: Symbol('Logger'),
  Config: Symbol('Config'),
  EventBus: Symbol('EventBus'),
  Auth: Symbol('Auth'),
  ApiClient: Symbol('ApiClient'),
  Storage: Symbol('Storage'),
  SessionStorage: Symbol('SessionStorage'),
  SelectorEngine: Symbol('SelectorEngine'),
  VisibilityChecker: Symbol('VisibilityChecker'),
  ElementResolver: Symbol('ElementResolver'),
  DomMutationObserver: Symbol('DomMutationObserver'),
  DomScanner: Symbol('DomScanner'),
  NavigationWatcher: Symbol('NavigationWatcher'),
  ZIndexManager: Symbol('ZIndexManager'),
  Backdrop: Symbol('Backdrop'),
  Spotlight: Symbol('Spotlight'),
  MaskLayer: Symbol('MaskLayer'),
  OverlayManager: Symbol('OverlayManager'),
  TooltipPositioner: Symbol('TooltipPositioner'),
  TooltipRenderer: Symbol('TooltipRenderer'),
  TooltipAnimator: Symbol('TooltipAnimator'),
  FlowLoader: Symbol('FlowLoader'),
  ProgressManager: Symbol('ProgressManager'),
  StepEngine: Symbol('StepEngine'),
  FlowRunner: Symbol('FlowRunner'),
  AnalyticsTracker: Symbol('AnalyticsTracker'),
  SessionTracker: Symbol('SessionTracker'),
  LifecycleManager: Symbol('LifecycleManager'),
  ErrorBoundary: Symbol('ErrorBoundary'),
  VersionManager: Symbol('VersionManager'),
  ConditionEvaluator: Symbol('ConditionEvaluator'),
  ContentSanitizer: Symbol('ContentSanitizer'),
  Container: Symbol('Container'),
} as const;

export type TokenKey = keyof typeof TOKENS;
