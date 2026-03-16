import { defineMiddleware } from "astro:middleware";
import { apiConfig } from "./features/search/data/api-config";

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
	if (!envApplied) await applyCloudflareEnv();

	const response = await next();

	// CDN page cache: all pages render identical HTML for all users.
	// Color mode applied client-side via localStorage, search target is URL-driven.
	if (context.request.method === "GET") {
		response.headers.set(
			"Cache-Control",
			"public, s-maxage=3600, stale-while-revalidate=300",
		);
	}

	return response;
});
