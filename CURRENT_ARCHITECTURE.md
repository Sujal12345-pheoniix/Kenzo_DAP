# Kenzo DAP — Current Architecture & Transformation Audit

**Version:** 1.0  
**Status:** Audit Complete (Phase 0)  
**Date:** July 2026  

---

## 1. Executive Summary

This document provides a comprehensive architectural audit of the **Kenzo Digital Adoption Platform (DAP)** codebase. It outlines what currently works, what is incomplete, what must be refactored, what can be reused, what should be removed, and the security and performance requirements for transforming Kenzo DAP into a production-grade, snippet-first platform for arbitrary websites.

---

## 2. What Currently Works

* **Dependency Injection Container**: Clean token-based DI container (`src/core/container.ts`, `src/core/registry.ts`, `src/core/tokens.ts`) managing service lifecycles.
* **Overlay & Spotlight System**: `Spotlight`, `Backdrop`, `MaskLayer`, `ZIndexManager`, and `OverlayManager` (`src/overlay/*`) rendering precise cutout highlights and backdrops around targeted elements.
* **Tooltip Renderer**: Glassmorphism dark mode UI (`src/tooltip/renderer.ts`) with step counters, progress bars, button normalization, and SVG arrow positioning.
* **Positioning System**: `TooltipPositioner` integrating `@floating-ui/dom` (`src/tooltip/positioning.ts`) with auto-flip, shift, and offset.
* **SPA Navigation Watcher**: `NavigationWatcher` (`src/navigation/navigation-watcher.ts`) intercepting `pushState`, `replaceState`, `popstate`, and `hashchange`.
* **Flow Runner State Machine**: `FlowRunner` and `StepEngine` (`src/flow/*`) handling flow progression, step navigation actions (`next`, `previous`, `skip`, `finish`, `close`), and analytics tracking.
* **Admin Dashboard & Step Editor**: React dashboard (`dashboard/src/components/tours-view.tsx`) with flow cards, status toggles, visual builder triggers, and an inline step editor modal.
* **Interactive CRM Sandbox**: `server/public/sandbox.html` simulating a full CRM application for live DAP testing.

---

## 3. What Is Incomplete

1. **One-Line Auto-Bootstrap**: The SDK currently requires manual `Kenzo.init({ apiKey })` calls. Automatic script tag inspection (`document.currentScript` reading `data-kenzo-key`, `data-api-base`, `data-environment`) is missing.
2. **Semantic DOM Intelligence**: `DomScanner` is currently a simple event callback wrapper around `MutationObserver`. It lacks semantic element classification, interactive element detection, form analysis, page fingerprinting, PII redaction, or structured element metadata extraction.
3. **Page Understanding & Application Mapping**: No server-side or SDK-side `PageModel` generation or automatic `ApplicationMap` graph builder.
4. **Stable Selector Generator & Element Fingerprinting**: Selectors are stored manually without multi-candidate ranking, stability scoring, or structural element fingerprinting.
5. **Self-Healing Pipeline**: No non-destructive fallback pipeline for damaged or changed CSS selectors (relying instead on fragile selector matches or universal body fallback).
6. **AI Intelligence Engine & Goal-Based Generation**: Suggestions currently rely on keyword match regexes in `seedProjectData` rather than a server-side AI pipeline (DOM Model → Sanitization → Application Map → AI Flow Generator → Draft → Approval → Publish).
7. **Public Identity Key vs Secret Security**: The SDK expects an `apiKey` that is treated as an authentication token; public installation keys (`kz_live_xxxxx`, `kz_test_xxxxx`) with domain origin verification must be decoupled from admin credentials.
8. **Experience Types & Audience Targeting**: Missing unified `Experience` abstraction for Beacons, Smart Tips, Announcements, Checklists, or audience segment rules.

---

## 4. What Must Be Refactored

* **`src/dom/dom-scanner.ts`**: Extend into a full DOM Intelligence Engine (`DOMScanner`, `DOMNormalizer`, `DOMClassifier`, `InteractiveElementDetector`, `FormDetector`, `PageAnalyzer`, `PageFingerprintGenerator`, `VisibilityAnalyzer`, `AccessibilityAnalyzer`, `DOMSerializer`).
* **`src/dom/selector-engine.ts` & `element-resolver.ts`**: Implement multi-candidate stable selector generation, candidate scoring, element fingerprinting, and a non-destructive self-healing recovery pipeline.
* **`src/core/lifecycle/lifecycle-manager.ts`**: Add snippet auto-bootstrapping from script tag attributes (`data-kenzo-key`), persistent session registration, heartbeat, and remove automatic progress resets on initialization.
* **`src/flow/flow-runner.ts` & `step-engine.ts`**: Support Experience abstractions, composable trigger evaluation (route match, element appearance, custom events, user segment), frequency controls (once, once-per-session, until-completed), and eliminate default `document.body` fallback for targeted steps.
* **`server/src/index.ts` & DB Schema**: Modularize API routes into `/api/v1/sdk/*`, `/api/v1/admin/*`, `/api/v1/builder/*`, `/api/v1/ai/*`, `/api/v1/analytics/*`, enforce origin domain verification, PII redaction, AI workflow generation, and draft-to-publish version snapshots.

---

## 5. What Can Be Reused

* Dependency injection container (`Container`, `TOKENS`, `registry.ts`).
* Floating-UI positioning service (`TooltipPositioner`).
* Overlay & Spotlight orchestrator (`OverlayManager`, `Spotlight`, `Backdrop`, `MaskLayer`, `ZIndexManager`).
* Tooltip CSS design system (`TooltipRenderer` styles & animations).
* History API event hooks in `NavigationWatcher`.
* Storage services (`LocalStorageService`, `SessionStorageService`, `CacheService`).
* React dashboard layout, cards, and modal dialogs.

---

## 6. What Should Be Removed

* **Universal `document.body` fallback for targeted steps**: Targeted steps whose elements cannot be resolved must fail gracefully or trigger self-healing rather than highlighting `body`. `body` is reserved strictly for modal/center experiences.
* **Universal progress reset on SDK initialization**: `for (const flow of flows) this.progressManager.reset(flow.id)` in `LifecycleManager` resets user progress on every page load; this must be replaced by configurable frequency rules.
* **Hardcoded authentication fallbacks**: Dev secret fallbacks and header-only admin bypasses in server routes.

---

## 7. Security Requirements

1. **Decouple Client Keys from Admin Tokens**: Client installation keys (`kz_live_xxx`) are public identifiers. The browser SDK must never receive or expose administrative JWT secrets or database master keys.
2. **Domain & Origin Verification**: Backend `/api/v1/sdk/*` endpoints must validate the `Origin` header against allowed project domains configured in the database.
3. **Privacy-First PII Redaction**: DOM scanning must redact sensitive data locally before network transmission. Password inputs, credit card fields, authorization tokens, cookies, session storage secrets, and PII selectors must never be uploaded to server-side AI engines.
4. **Content Security Policy (CSP) Compliance**: No `eval()`, `new Function()`, or unsafe inline code execution.

---

## 8. Performance Requirements

1. **MutationObserver Optimization**: Mutation processing must use batching, debouncing, changed-subtree scanning, and explicit exclusion of Kenzo's own injected UI elements (`data-kenzo-overlay`, `#ken-launcher-widget`, etc.) to prevent observer loops.
2. **Incremental Scanning**: Scans must target active interactive subtrees rather than serializing the entire DOM tree repeatedly.
3. **Non-Blocking UX**: SDK initialization, analytics batching, and DOM analysis must execute asynchronously without blocking host application rendering or main thread interaction.

---

## 9. Next Steps

With Phase 0 complete, implementation will proceed sequentially through Phases 1 to 10 as specified in the development roadmap:
- **Phase 1**: One-line auto-bootstrap (`data-kenzo-key`) & public key identity.
- **Phase 2**: Real DOM intelligence engine & PII redactor.
- **Phase 3**: Semantic PageModel & Application Map.
- **Phase 4**: Multi-strategy stable selector generator & target validation.
- **Phase 5**: Builder upgrade & cross-page workflow recorder.
- **Phase 6**: Server-side AI flow generation pipeline.
- **Phase 7**: Draft → Preview → Approval → Publish pipeline.
- **Phase 8**: Runtime targeting & self-healing pipeline.
- **Phase 9**: Analytics & optimization intelligence.
- **Phase 10**: Security/performance hardening & E2E integration verification.
