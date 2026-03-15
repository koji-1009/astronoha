/**
 * API URL configuration. Defaults to production URLs.
 * Middleware overrides these with Cloudflare env vars when present,
 * enabling E2E tests to redirect to a mock API server.
 *
 * Module state is shared across requests in workerd (same isolate),
 * unlike process.env which is per-module in workerd.
 */
export const apiConfig = {
	kokkai: "https://kokkai.ndl.go.jp/api",
	teikoku: "https://teikokugikai-i.ndl.go.jp/api/emp",
	opensearch: "https://ndlsearch.ndl.go.jp/api/opensearch",
	sru: "https://ndlsearch.ndl.go.jp/api/sru",
};
