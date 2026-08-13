# KENZO DAP — MASTER INTEGRATION AUDIT

## 1. Current Architecture
Kenzo DAP consists of three primary components:
- **Backend Server (`server/`)**: Node.js/Express TypeScript backend connected to Neon PostgreSQL database, exposing Admin REST APIs and Public SDK APIs.
- **Admin Dashboard (`dashboard/`)**: Vite + React + Tailwind CSS dark-mode dashboard for managing flows, smart tips, popups, beacons, surveys, task lists, self-help articles, and viewing real analytics.
- **SDK (`src/`)**: TypeScript client library compiled into a UMD bundle (`dist/kenzo-sdk.umd.cjs`) served publicly at `/sdk.js`.

## 2. DAP Architecture
- Multi-tenant architecture with support for Organizations, Projects, Environments, and Project Keys.
- Public SDK authenticates via `POST /api/v1/auth/sdk` using project installation key and origin.

## 3. ERP Architecture (`Kenzo_OneERP`)
- Multi-tenant Next.js 16 (Turbopack / App Router) SaaS platform with Prisma ORM and PostgreSQL database.
- Integrates DAP via `<Script>` component in `src/components/kenzo-loader.tsx` imported inside `app/layout.tsx`.

## 4. TruthBomb Architecture (`TruthBomb`)
- Next.js 15 AI Fact Verification & GEO Intelligence platform.
- Integrates DAP via `<KenzoLoader />` client component in `src/components/layout/kenzo-loader.tsx`.

## 5. Integration Points
- Public SDK script tag served from `https://kenzo-dap.onrender.com/sdk.js`.
- Authentication via `POST https://kenzo-dap.onrender.com/api/v1/auth/sdk`.
- Published experiences loaded via `GET https://kenzo-dap.onrender.com/api/v1/flows/published`.
- Event tracking via `POST https://kenzo-dap.onrender.com/api/v1/analytics/event`.

## 6. API Dependencies
- PostgreSQL Neon Database connection.
- Express REST API routes under `/api/v1`.

## 7. SDK Dependencies
- Floating UI positioning (`@floating-ui/dom`).
- Browser DOM MutationObserver and NavigationWatcher.

## 8. Authentication Dependencies
- Admin session JWTs for Admin Dashboard endpoints.
- Short-lived SDK runtime tokens for client public APIs.

## 9. Database Dependencies
- PostgreSQL database (`connection.ts`).

## 10. Project-Key Dependencies
- Server-generated project keys (`kz_live_...` / `kz_test_...`).

## 11. Runtime Dependencies
- Client browser DOM environment (`window`, `document`, `fetch`).

## 12. Analytics Dependencies
- Real analytics tables (`analytics_events`, `sessions`) in PostgreSQL.

## 13. Deployment Dependencies
- **Kenzo DAP**: Render (`https://kenzo-dap.onrender.com`).
- **Kenzo OneERP**: Vercel (`https://kenzo-one-erp.vercel.app`).
- **TruthBomb**: Vercel (`https://truth-bomb-eight.vercel.app`).

## 14. Security Vulnerabilities
- Public key vs Admin authorization separation enforcement.
- Origin validation against project `allowed_origins`.
- Elimination of unverified `x-project-id` trust.

## 15. Broken Workflows
- Hardcoded hostname fallbacks (now removed).
- Server Component script event handler serialization (now fixed via Client Component loader).

## 16. Duplicate Logic
- Multiple manual `Kenzo.init()` calls consolidated into single-bootstrap engine.

## 17. Mock Logic
- Real analytics database queries used across all dashboard metrics.

## 18. Hardcoded Values
- Removed all hardcoded key strings and hostname checks from generic SDK core.

## 19. Local-Storage Dependencies
- PostgreSQL database is the single authoritative source of truth.

## 20. Production Risks
- SSL certificate verification enforced in production database pool.
