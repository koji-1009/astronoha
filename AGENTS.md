# AGENTS.md

Supplementary rules for parallel agent execution on astronoha.

## Common Rules

* All rules in `CLAUDE.md` apply to every agent. This document adds parallel-execution concerns only.
* No two agents edit the same file concurrently.
* Creating new files is unrestricted. Edits to existing files are limited to the agent's assigned scope.
* Run only your own module's tests. The orchestrator runs the full suite.

## Task Scopes

### API Client Task

Owned files: `src/features/search/data/`, `tests/features/search/data/`, `tests/fixtures/`

* Implement and test NDL API clients.
* `ndl-fetch.ts` is the shared fetch layer: API response cache (12h TTL), rate limiting (3s/1s light), retry (1x), timeout (10s). All NDL API calls must go through `ndlFetch()`.
* Rate limiting/caching/retry tests belong in `ndl-fetch.test.ts` only. Do not duplicate in consumer test files.
* Define Zod schemas.
* Create fixture JSON files.
* Do not modify `src/shared/`, `src/pages/`, or `src/features/*/components/`.

### Speaker Profile Task

Owned files: `src/features/speaker/`, `tests/features/speaker/`

* Speaker name search, aggregation logic, keyword extraction.
* Imports search feature's `data/` (does not modify it).
* NDL Search integration via `search/data/ndl-search.ts`.

### Timeline Task

Owned files: `src/features/timeline/`, `tests/features/timeline/`

* Publication year query construction and date merge logic.
* Imports search feature's `data/kokkai.ts`, `data/teikoku.ts`, `data/ndl-search.ts` (does not modify them).

### Theme / Design Task

Owned files: `src/styles/`, `src/i18n/`

* MD3 token CSS definitions.
* MD3 color tokens are static (fixed seed color #316745 千歳緑 in global.css).
* Global CSS.

### Page / Routing Task

Owned files: `src/pages/`, `src/shared/layout/`, `src/shared/components/`, `src/middleware.ts`

* Astro page implementation (word/, speaker/, timeline/).
* Layout definitions.
* Middleware cookie reading.
* Calls API clients via import only. Does not modify API clients.

### Island Task

Owned files: `src/features/*/components/` (`.tsx` files)

* React Island component implementation.
* Chrome built-in AI (Prompt API) integration.
* Islands receive data via props. Does not modify SSR-side code.

### Action Task

Owned files: `src/actions/`, `src/features/settings/data/`

* Astro Action definitions.
* Settings Action validates input with Zod schema, sets HttpOnly cookie.

## NDL API Real Requests

* When hitting NDL APIs during development, respect rate limits (wait several seconds between requests).
* Tests must never hit NDL APIs. Use mocks.
* Fixture updates (fetching real API responses) are done manually and committed to `tests/fixtures/`.

## E2E Tests

Owned files: `e2e/`, `playwright.config.ts`

* Playwright + Chromium. Run with `npm run e2e` (requires `npm run build` first).
* `e2e/mock-api-server.mjs` provides a local mock NDL API (port 4010). `e2e/start-preview.mjs` starts the Astro preview server (port 4321). Both are launched automatically by Playwright's `webServer` config.
* E2E tests cover: navigation, search results, speech detail, speaker profile, theme, a11y, layout.
* Never hit real NDL APIs from E2E. The mock server returns fixture responses.
* E2E test scope is cross-cutting — it is not assigned to a single task. The orchestrator runs E2E after all tasks complete.

## Build Verification

* After changes in your scope, confirm `npm run build` passes.
* Confirm no Biome errors with `npm run check`.
