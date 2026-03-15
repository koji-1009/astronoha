/**
 * Start the Astro preview server with mock API URLs injected
 * into the wrangler.json vars. This is necessary because workerd
 * reads environment variables from wrangler config, not process.env.
 *
 * Usage: node e2e/start-preview.mjs
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wranglerPath = join(__dirname, "../dist/server/wrangler.json");

const MOCK_API_BASE = process.env.MOCK_API_BASE ?? "http://localhost:4010";

// Inject mock API URLs into wrangler.json vars
const config = JSON.parse(readFileSync(wranglerPath, "utf-8"));
config.vars = {
	...config.vars,
	KOKKAI_API_URL: `${MOCK_API_BASE}/kokkai`,
	TEIKOKU_API_URL: `${MOCK_API_BASE}/teikoku`,
	NDL_OPENSEARCH_URL: `${MOCK_API_BASE}/ndl/opensearch`,
	NDL_SRU_URL: `${MOCK_API_BASE}/ndl/sru`,
};
writeFileSync(wranglerPath, JSON.stringify(config));

console.log("Injected mock API URLs into wrangler.json");
console.log("Starting preview server...");

// Start the preview server (inherits stdio so Playwright can see output)
execSync("npm run preview", {
	cwd: join(__dirname, ".."),
	stdio: "inherit",
});
