# CLAUDE.md

astronoha — A web application that cross-searches National Diet Library APIs, exploring 150 years of parliamentary speech from Meiji to Reiwa.

## Architecture

Follow CRZ (Crumple Zone Architecture). Principles, decision criteria, and patterns are defined in `.claude/skills/crz.md`. This document describes only astronoha-specific rules.

### Deviations from CRZ

None. Follow all CRZ principles.

### CRZ Application Notes

* **No authentication.** The "When authentication is required" section of CRZ Security Boundary does not apply. Middleware only applies Cloudflare env bindings and sets CDN cache headers.
* **Chrome built-in AI.** Per CRZ Component Decisions, the Prompt API is implemented as a Stateful Island (Layer 4) since it requires local state for session management. If this island crashes, core functionality (search, browse, share) remains 100% operational on Layers 1-2.

## Tech Stack

* **Framework**: Astro 6.x (SSR, MPA)
* **UI Library**: React 19.x (Islands)
* **Runtime**: Cloudflare Workers (workerd)
* **Adapter**: @astrojs/cloudflare
* **Validation**: Zod 4.x (bundled with Astro 6)
* **Lint / Format**: Biome 2.x
* **Test**: Vitest
* **Language**: TypeScript (strictest)
* **XML Parser**: fast-xml-parser
* **Browser AI**: Chrome built-in AI (Prompt API / LanguageModel API)

## Commands

```bash
npm run dev        # Start dev server (workerd)
npm run build      # Production build
npm run preview    # Preview build output
npm run check      # Biome lint + format check
npm run format     # Biome auto-format
npm test           # Run Vitest
npm run test:coverage  # Vitest with coverage (80% threshold, runs in CI)
npm run test:watch # Vitest watch mode
npm run e2e        # Playwright E2E tests (requires build first)
npx wrangler d1 migrations apply astronoha-heatmap --local  # Apply D1 migrations (local dev)
```

## Astro 6 Specifics

* `astro dev` runs on workerd runtime. Zero difference between dev and production.
* `import.meta.env` is inlined at build time. Use `process.env` for runtime environment variables.
* Access Cloudflare bindings via `cloudflare:workers` module.

## File Structure

Follows CRZ `features/` pattern.

```
src/
├── features/
│   ├── search/           # Cross-era keyword search
│   │   ├── data/         # NDL API clients (server-only)
│   │   │   ├── ndl-fetch.ts    # Shared fetch: API response cache, rate limit, retry
│   │   │   ├── speech-api.ts   # Shared speech search logic (used by kokkai/teikoku)
│   │   │   ├── api-config.ts   # API URL configuration
│   │   │   ├── heatmap.ts      # Year-by-year speech counts (D1)
│   │   │   ├── kokkai.ts
│   │   │   ├── teikoku.ts
│   │   │   ├── ndl-search.ts
│   │   │   ├── ndl-thumbnail.ts
│   │   │   └── schemas.ts
│   │   ├── lib/
│   │   │   └── chrome-ai.ts   # Chrome Prompt API abstraction
│   │   └── components/   # .astro + islands (.tsx)
│   ├── speaker/          # Speaker profile
│   │   ├── data/         # Aggregation & keyword extraction (server-only)
│   │   └── components/
│   └── timeline/         # Parliamentary speech × publications timeline
│       ├── data/         # Publication year query + date merge logic (server-only)
│       └── components/
├── shared/
│   ├── layout/           # Layouts
│   ├── components/       # Shared components (Pagination, etc.)
│   └── types/            # Shared type definitions
├── i18n/
│   └── ui.ts                 # Centralized UI strings dictionary
├── middleware.ts
├── pages/
│   ├── index.astro
│   ├── word/
│   │   ├── [keyword].astro
│   │   └── [keyword]/
│   │       └── [speechId].astro
│   ├── speaker/
│   │   └── [name].astro
│   ├── timeline/
│   │   ├── index.astro
│   │   └── [period].astro
│   ├── settings.astro
│   ├── about.astro
│   ├── 404.astro
│   └── 500.astro
└── styles/
    └── global.css
```

`features/*/data/` is called only from frontmatter, per CRZ. Never import from islands.

### Cross-Feature Data Sharing

* speaker feature imports `search/data/kokkai.ts` and `search/data/ndl-search.ts`. Speaker-specific aggregation and extraction logic lives in `speaker/data/`.
* timeline feature imports `search/data/kokkai.ts`, `search/data/teikoku.ts`, and `search/data/ndl-search.ts`. Publication year query construction and date merge logic lives in `timeline/data/`.
* Importing another feature's `data/` is allowed. Importing another feature's `components/` is not. Shared components go in `shared/components/`.

## Code Conventions

* TypeScript strictest mode (`astro/tsconfigs/strictest`). No `any`.
* External API responses: use Zod schemas for parsing XML-based responses (NDL Search) where the parser output is untyped. For JSON API responses (kokkai/teikoku speech APIs), type assertions are acceptable to avoid Zod traversal overhead under Workers free tier 10ms CPU limit. Zod schemas remain the canonical type definitions in `schemas.ts`.
* Never swallow errors. Display meaningful messages for NDL API errors.
* Attribution: every search result page must include "Source: National Diet Library" with a link to the API.
* Imports follow Biome import organizer. Do not sort manually.

## Biome Rules

* Biome 2.4+.
* Enable `react` domain.
* Enable import organizer.
* `.astro` files: `experimentalFullHtmlSupportEnabled: true`.
* CI runs `biome ci`.
* `biome-ignore` comments are a last resort.

## Test Rules

In addition to CRZ Test Strategy, apply these astronoha-specific rules:

* Test framework: Vitest.
* **Full unit tests for all external API connections. This is mandatory.**
  * Every module under `src/features/*/data/` must have corresponding tests.
  * Coverage: request URL construction, response parsing (happy path), response parsing (error/missing fields), error response handling.
  * Rate limiting, caching, retry, and timeout are tested in `ndl-fetch.test.ts`. Do not duplicate in consumer tests.
  * Mock HTTP requests. Never hit actual NDL APIs in tests.
  * Store real NDL API responses as fixtures in `tests/fixtures/`.
  * speaker feature: test aggregation logic that calls search data clients. Keyword extraction accuracy.
  * timeline feature: publication year query construction, date merge logic between parliamentary API responses and NDL Search responses.
* heatmap feature: D1 database queries, batch generation, year range calculations, API routing.
* Test file names: `*.test.ts`. Do not use `*.spec.ts`.
* E2E tests: Playwright (`e2e/`). Mock API server (`e2e/mock-api-server.mjs`) provides fixture responses. Never hit real NDL APIs.

```
tests/
├── fixtures/                    # Real NDL API response samples (JSON)
├── features/
│   ├── search/
│   │   └── data/
│   │       ├── ndl-fetch.test.ts
│   │       ├── kokkai.test.ts
│   │       ├── teikoku.test.ts
│   │       ├── ndl-search.test.ts
│   │       ├── ndl-thumbnail.test.ts
│   │       ├── schemas.test.ts
│   │       └── heatmap.test.ts
│   ├── speaker/
│   │   └── data/
│   │       └── speaker.test.ts
│   └── timeline/
│       └── data/
│           └── timeline.test.ts
└── shared/
```

## Design Rules

* Follow MD3 design tokens throughout. Color, typography, spacing, shape, and elevation are all token-based.
* No component library dependencies (`@material/web`, `mdui`, etc.). Style native HTML elements with MD3 tokens.
* CSS custom property naming follows `--md-sys-*` (system tokens) and `--md-ref-*` (reference tokens).
* Font: `system-ui` stack. No web fonts.
* Spacing: 4px grid (`--md-sys-spacing-*`). No magic pixel values.
* Dark mode: switch via `prefers-color-scheme: dark`. User's `colorMode` localStorage preference takes precedence.
* For design judgment, reference the frontend-design skill's thinking process (Purpose → Tone → Differentiation), but MD3 tokens are the overriding constraint.
* Tone: editorial / magazine. Honor the weight of parliamentary records while making search and discovery enjoyable.
* Accessibility: skip-to-content link, `<label>` on all form inputs (visually hidden where appropriate), `prefers-reduced-motion` support, `@media print` styles.
* Canonical URL: `<link rel="canonical">` on all pages. `page=1` is normalized (param removed).

## NDL API Notes

* All NDL API calls go through `ndl-fetch.ts`, which provides:
  * **API response cache**: Cloudflare Cache API (per-PoP), 12-hour TTL. Caches upstream API responses, not rendered pages.
  * **Rate limit**: 1-second minimum between requests per host (per-isolate). Sequential execution, not `Promise.all`.
  * **Retry**: 1 retry with 2-second backoff on network/timeout failures.
  * **Timeout**: 10-second `AbortSignal.timeout` on all fetch calls.
* Be mindful of Workers free tier (10ms CPU time per request).
* API response date fields have no timezone info (assume JST).
* Partial failure: pages show partial results with warning banners when some APIs fail.

## Settings Management

Settings are client-only (localStorage). No server interaction needed.

* **colorMode** ("system" | "light" | "dark"): stored in `localStorage["astronoha_colorMode"]`. Applied via inline `<script>` before first paint to avoid FOUC. Settings page binds `change` events to update localStorage and `data-color-mode` attribute.
* **autoSummary** (boolean): stored in `localStorage["astronoha_autoSummary"]`. When enabled, Chrome AI automatically runs the primary action on page load (summary on speech detail, keywords on search results, trend on heatmap). The panel is always visible when Chrome AI is available; this setting only controls automatic execution.
* **searchTarget**: not a setting — URL-driven via `?target=kokkai|teikoku|both` query parameter (default: "both").
* All pages render identical HTML regardless of user preferences, enabling CDN caching (`s-maxage=3600`).

## Chrome Built-in AI

* Check availability with `LanguageModel.availability()`.
* Core functionality works 100% without LLM (CRZ Reliability Layers 1-2).
* Prompt API calls are contained within React Islands. Nothing sent to server.
* Non-supporting browsers: disable buttons, show guidance. Chrome stable (desktop) supports Prompt API.
* AI results are cached in sessionStorage, scoped per URL + query params. This is a cache (CRZ "in-progress data"), not a canonical source — results are re-generated if cleared. Lost on tab close. If a cached result exists on mount, it is displayed immediately without waiting for the availability check.
