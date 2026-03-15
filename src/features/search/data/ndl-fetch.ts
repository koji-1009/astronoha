/**
 * Shared rate-limited, cached fetch for all NDL API requests.
 *
 * API response cache: Cloudflare Cache API (per-PoP, survives isolate
 * restarts). Caches upstream NDL API responses, not rendered pages.
 * 12-hour TTL. Parliamentary records rarely change.
 *
 * Rate limiter ensures sequential API access on cache miss.
 * Retry (1 attempt) handles transient network failures.
 */

const RATE_LIMIT_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_S = 12 * 60 * 60; // 12 hours
const RETRY_COUNT = 1;
const RETRY_DELAY_MS = 2000;

/** Per-host rate limit tracking. Different NDL APIs run on different hosts. */
const lastRequestTimeByHost = new Map<string, number>();

function getHost(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return "";
	}
}

/**
 * Get the Cloudflare API response cache, or null if unavailable.
 * Returns null in Node.js / test environments.
 */
function getEdgeCache(): Cache | null {
	try {
		return caches.default;
	} catch {
		return null;
	}
}

/**
 * Fetch a URL with edge caching, rate limiting, and retry.
 *
 * Lookup order: API response cache → NDL API (with rate limit + retry)
 * On cache miss, the response is stored in the API response cache.
 *
 * @throws {Error} On HTTP errors or timeout (after retry)
 */
export async function ndlFetch(url: string): Promise<Response> {
	// Check API response cache
	const edgeCache = getEdgeCache();
	if (edgeCache) {
		try {
			const cached = await edgeCache.match(url);
			if (cached) return cached;
		} catch {
			// Edge cache unavailable — continue to fetch
		}
	}

	// Cache miss — fetch with rate limiting and retry
	const host = getHost(url);
	let lastError: unknown;

	for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
		if (attempt > 0) {
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
		}

		// Rate limit (per host)
		const delay = RATE_LIMIT_DELAY_MS;
		const now = Date.now();
		const lastTime = lastRequestTimeByHost.get(host) ?? 0;
		const elapsed = now - lastTime;
		if (lastTime > 0 && elapsed < delay) {
			const waitTime = delay - elapsed;
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}
		lastRequestTimeByHost.set(host, Date.now());

		try {
			const response = await fetch(url, {
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			});

			if (!response.ok) return response;

			// Consume body once, use for both cache and return
			const body = await response.text();
			if (edgeCache) {
				try {
					const headers = new Headers(response.headers);
					headers.set("Cache-Control", `public, max-age=${CACHE_TTL_S}`);
					edgeCache.put(
						url,
						new Response(body, { status: response.status, headers }),
					);
				} catch {
					// Edge cache write failed
				}
			}
			return new Response(body, {
				status: response.status,
				headers: response.headers,
			});
		} catch (error) {
			lastError = error;
			if (error instanceof DOMException && error.name === "TimeoutError") {
				lastError = new Error(
					`NDL API request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds`,
				);
			}
		}
	}

	throw lastError;
}

export function _resetRateLimitTimer(): void {
	lastRequestTimeByHost.clear();
}
