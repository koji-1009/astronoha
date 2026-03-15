import { defineMiddleware } from "astro:middleware";
import { apiConfig } from "./features/search/data/api-config";
import { decodeSettings } from "./features/settings/data/cookie";
import { DEFAULT_SETTINGS } from "./shared/types/settings";

// Apply Cloudflare env bindings to shared apiConfig once.
// In workerd, process.env is per-module and not shared, but module
// exports (apiConfig) are shared across the isolate.
let envApplied = false;
async function applyCloudflareEnv(): Promise<void> {
	if (envApplied) return;
	try {
		const { env } = await import("cloudflare:workers");
		envApplied = true;
		const vars = env as Record<string, unknown>;
		if (typeof vars.KOKKAI_API_URL === "string")
			apiConfig.kokkai = vars.KOKKAI_API_URL;
		if (typeof vars.TEIKOKU_API_URL === "string")
			apiConfig.teikoku = vars.TEIKOKU_API_URL;
		if (typeof vars.NDL_OPENSEARCH_URL === "string")
			apiConfig.opensearch = vars.NDL_OPENSEARCH_URL;
		if (typeof vars.NDL_SRU_URL === "string") apiConfig.sru = vars.NDL_SRU_URL;
	} catch {
		// Not running in workerd — defaults are used
	}
}

export const onRequest = defineMiddleware(async (context, next) => {
	await applyCloudflareEnv();
	const cookie = context.cookies.get("astronoha_settings")?.value;
	context.locals.settings = cookie ? decodeSettings(cookie) : DEFAULT_SETTINGS;

	const response = await next();

	// CDN page cache: most pages render identical HTML for all users
	// (colorMode is applied client-side via inline script, search target is URL-driven).
	// Excluded: POST/Action responses (method check) and /settings (personalized SSR).
	if (
		context.request.method === "GET" &&
		!context.url.pathname.startsWith("/settings")
	) {
		response.headers.set(
			"Cache-Control",
			"public, s-maxage=3600, stale-while-revalidate=300",
		);
	}

	return response;
});
