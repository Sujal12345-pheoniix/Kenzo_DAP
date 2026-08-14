/**
 * Service registry — wires all modules into the DI container.
 * @module core/registry
 */

import { ApiClient } from '@/api/api-client';
import { AnalyticsTracker } from '@/analytics/analytics-tracker';
import { SessionTracker } from '@/analytics/session-tracker';
import { AuthService } from '@/core/auth/auth.service';
import { ConditionEvaluator } from '@/core/conditions/condition-evaluator';
import { ConfigService } from '@/core/config/config.service';
import { Container } from '@/core/container';
import { ErrorBoundary } from '@/core/error-boundary/error-boundary';
import { LifecycleManager } from '@/core/lifecycle/lifecycle-manager';
import { Logger } from '@/core/logger/logger';
import { TOKENS } from '@/core/tokens';
import { VersionManager } from '@/core/version/version-manager';
import { DomScanner } from '@/dom/dom-scanner';
import { DomMutationObserverService } from '@/dom/mutation-observer';
import { ElementResolver } from '@/dom/element-resolver';
import { SelectorEngine } from '@/dom/selector-engine';
import { VisibilityChecker } from '@/dom/visibility-checker';
import { FlowLoader } from '@/flow/flow-loader';
import { FlowRunner } from '@/flow/flow-runner';
import { ProgressManager } from '@/flow/progress-manager';
import { StepEngine } from '@/flow/step-engine';
import { NavigationWatcher } from '@/navigation/navigation-watcher';
import { Backdrop } from '@/overlay/backdrop';
import { MaskLayer } from '@/overlay/mask-layer';
import { OverlayManager } from '@/overlay/overlay-manager';
import { Spotlight } from '@/overlay/spotlight';
import { ZIndexManager } from '@/overlay/z-index-manager';
import { LocalStorageService } from '@/storage/local-storage.service';
import { SessionStorageService } from '@/storage/session-storage.service';
import { TooltipAnimator } from '@/tooltip/animations';
import { TooltipPositioner } from '@/tooltip/positioning';
import { TooltipRenderer } from '@/tooltip/renderer';
import { EventBus } from '@/utils/event-bus';
import { ContentSanitizer } from '@/utils/sanitizer';

export function createContainer(): Container {
  const container = new Container();

  container.registerSingleton(TOKENS.Logger, () => new Logger());
  container.registerSingleton(TOKENS.EventBus, () => new EventBus());

  container.registerSingleton(TOKENS.Config, () => {
    const logger = container.resolve<Logger>(TOKENS.Logger);
    return new ConfigService(logger);
  });

  container.registerSingleton(TOKENS.Storage, () => {
    const logger = container.resolve<Logger>(TOKENS.Logger);
    const config = container.resolve<ConfigService>(TOKENS.Config);
    return new LocalStorageService(logger, config);
  });

  container.registerSingleton(TOKENS.SessionStorage, () => {
    const logger = container.resolve<Logger>(TOKENS.Logger);
    return new SessionStorageService(logger);
  });

  container.registerSingleton(TOKENS.ApiClient, () => {
    const logger = container.resolve<Logger>(TOKENS.Logger);
    // Use the correct production server as the default base URL.
    // LifecycleManager will call setBaseUrl() with the real apiBaseUrl
    // from options right after config.init() — this is just a safe fallback.
    return new ApiClient('https://kenzo-dap.onrender.com/api/v1', logger);
  });

  container.registerSingleton(TOKENS.Auth, () => {
    return new AuthService(
      container.resolve(TOKENS.ApiClient),
      container.resolve(TOKENS.Storage),
      container.resolve(TOKENS.Logger),
    );
  });

  container.registerSingleton(TOKENS.ErrorBoundary, () => {
    return new ErrorBoundary(
      container.resolve(TOKENS.Logger),
      container.resolve(TOKENS.EventBus),
    );
  });

  container.registerSingleton(TOKENS.VersionManager, () => new VersionManager());

  container.registerSingleton(TOKENS.ContentSanitizer, () => new ContentSanitizer());

  container.registerSingleton(TOKENS.ConditionEvaluator, () => {
    return new ConditionEvaluator(container.resolve(TOKENS.Config));
  });

  container.registerSingleton(TOKENS.SelectorEngine, () => new SelectorEngine());
  container.registerSingleton(TOKENS.VisibilityChecker, () => new VisibilityChecker());

  container.registerSingleton(TOKENS.ElementResolver, () => {
    return new ElementResolver(
      container.resolve(TOKENS.SelectorEngine),
      container.resolve(TOKENS.VisibilityChecker),
      container.resolve(TOKENS.Config),
      container.resolve(TOKENS.EventBus),
      container.resolve(TOKENS.Logger),
    );
  });

  container.registerSingleton(TOKENS.DomMutationObserver, () => new DomMutationObserverService());

  container.registerSingleton(TOKENS.DomScanner, () => {
    return new DomScanner(container.resolve(TOKENS.DomMutationObserver));
  });

  container.registerSingleton(TOKENS.NavigationWatcher, () => {
    return new NavigationWatcher(container.resolve(TOKENS.EventBus));
  });

  container.registerSingleton(TOKENS.ZIndexManager, () => {
    const config = container.resolve<ConfigService>(TOKENS.Config);
    const base = config.isReady() ? config.get().zIndexBase : 2147483000;
    return new ZIndexManager(base);
  });

  container.register(TOKENS.Backdrop, () => {
    return new Backdrop(container.resolve(TOKENS.ZIndexManager));
  });

  container.register(TOKENS.MaskLayer, () => {
    return new MaskLayer(container.resolve(TOKENS.ZIndexManager));
  });

  container.register(TOKENS.Spotlight, () => {
    return new Spotlight(container.resolve(TOKENS.ZIndexManager));
  });

  container.registerSingleton(TOKENS.OverlayManager, () => {
    return new OverlayManager(
      new Backdrop(container.resolve(TOKENS.ZIndexManager)),
      new MaskLayer(container.resolve(TOKENS.ZIndexManager)),
      new Spotlight(container.resolve(TOKENS.ZIndexManager)),
    );
  });

  container.register(TOKENS.TooltipPositioner, () => new TooltipPositioner());
  container.register(TOKENS.TooltipAnimator, () => new TooltipAnimator());

  container.register(TOKENS.TooltipRenderer, () => {
    const config = container.resolve<ConfigService>(TOKENS.Config);
    // Read darkMode lazily — config IS ready by the time the renderer is
    // first requested (always after LifecycleManager.initialize()).
    const darkMode = config.isReady() ? config.get().darkMode : false;
    return new TooltipRenderer(
      container.resolve(TOKENS.ContentSanitizer),
      container.resolve(TOKENS.ZIndexManager),
      darkMode,
    );
  });

  container.registerSingleton(TOKENS.ProgressManager, () => {
    return new ProgressManager(container.resolve(TOKENS.Storage));
  });

  container.registerSingleton(TOKENS.FlowLoader, () => {
    return new FlowLoader(
      container.resolve(TOKENS.ApiClient),
      container.resolve(TOKENS.Storage),
      container.resolve(TOKENS.Logger),
    );
  });

  container.registerSingleton(TOKENS.SessionTracker, () => {
    return new SessionTracker(container.resolve(TOKENS.SessionStorage));
  });

  container.registerSingleton(TOKENS.AnalyticsTracker, () => {
    return new AnalyticsTracker(
      container.resolve(TOKENS.ApiClient),
      container.resolve(TOKENS.SessionTracker),
      container.resolve(TOKENS.Config),
      container.resolve(TOKENS.EventBus),
      container.resolve(TOKENS.Logger),
    );
  });

  container.registerSingleton(TOKENS.FlowRunner, () => {
    return new FlowRunner(
      container.resolve(TOKENS.ProgressManager),
      container.resolve(TOKENS.ConditionEvaluator),
      container.resolve(TOKENS.NavigationWatcher),
      container.resolve(TOKENS.AnalyticsTracker),
      container.resolve(TOKENS.EventBus),
      container.resolve(TOKENS.Logger),
      (onFlowEnd) =>
        new StepEngine(
          container.resolve(TOKENS.ElementResolver),
          container.resolve(TOKENS.OverlayManager),
          container.resolve(TOKENS.TooltipRenderer),
          container.resolve(TOKENS.TooltipPositioner),
          container.resolve(TOKENS.TooltipAnimator),
          container.resolve(TOKENS.ProgressManager),
          container.resolve(TOKENS.ConditionEvaluator),
          container.resolve(TOKENS.AnalyticsTracker),
          container.resolve(TOKENS.EventBus),
          container.resolve(TOKENS.Config),
          container.resolve(TOKENS.Logger),
          onFlowEnd,
        ),
    );
  });

  container.registerSingleton(TOKENS.LifecycleManager, () => {
    return new LifecycleManager(
      container.resolve(TOKENS.Config),
      container.resolve(TOKENS.Auth),
      container.resolve(TOKENS.ApiClient),
      container.resolve(TOKENS.FlowLoader),
      container.resolve(TOKENS.FlowRunner),
      container.resolve(TOKENS.NavigationWatcher),
      container.resolve(TOKENS.OverlayManager),
      container.resolve(TOKENS.AnalyticsTracker),
      container.resolve(TOKENS.EventBus),
      container.resolve(TOKENS.Logger),
      container.resolve(TOKENS.ConditionEvaluator),
      container.resolve(TOKENS.ProgressManager),
    );
  });

  return container;
}
