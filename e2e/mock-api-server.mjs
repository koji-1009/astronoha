/**
 * Mock API server for E2E tests.
 * Serves fixture data from tests/fixtures/ at routes matching
 * the real NDL API paths.
 *
 * Usage: node e2e/mock-api-server.mjs
 * Env:   MOCK_PORT (default: 4010)
 */

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../tests/fixtures");

const kokkaiSpeech = readFileSync(
	join(fixturesDir, "kokkai-speech-response.json"),
	"utf-8",
);
const teikokuSpeech = readFileSync(
	join(fixturesDir, "teikoku-speech-response.json"),
	"utf-8",
);
const openSearchXml = readFileSync(
	join(fixturesDir, "ndl-search-response.xml"),
	"utf-8",
);
const sruXml = readFileSync(join(fixturesDir, "ndl-sru-response.xml"), "utf-8");

const PORT = Number(process.env.MOCK_PORT ?? 4010);

const server = createServer((req, res) => {
	const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
	const path = url.pathname;

	// Health check for Playwright readiness
	if (path === "/health") {
		res.writeHead(200, { "Content-Type": "text/plain" });
		res.end("ok");
		return;
	}

	// Error simulation: keyword "__error__" triggers 500 on speech APIs
	const anyParam = url.searchParams.get("any");
	const isErrorKeyword = anyParam === "__error__";

	// Kokkai speech API
	if (path === "/kokkai/speech") {
		if (isErrorKeyword) {
			res.writeHead(500, { "Content-Type": "text/plain" });
			res.end("Internal Server Error (mock)");
			return;
		}
		res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
		res.end(kokkaiSpeech);
		return;
	}

	// Teikoku speech API
	if (path === "/teikoku/speech") {
		if (isErrorKeyword) {
			res.writeHead(500, { "Content-Type": "text/plain" });
			res.end("Internal Server Error (mock)");
			return;
		}
		res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
		res.end(teikokuSpeech);
		return;
	}

	// NDL OpenSearch API
	if (path === "/ndl/opensearch") {
		if (isErrorKeyword) {
			res.writeHead(503, { "Content-Type": "text/plain" });
			res.end("Service Unavailable (mock)");
			return;
		}
		res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
		res.end(openSearchXml);
		return;
	}

	// NDL SRU API
	if (path === "/ndl/sru") {
		res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
		res.end(sruXml);
		return;
	}

	// 404 for unknown routes
	res.writeHead(404, { "Content-Type": "text/plain" });
	res.end(`Mock API: unknown route ${path}`);
});

server.listen(PORT, () => {
	console.log(`Mock API server listening on http://localhost:${PORT}`);
});
