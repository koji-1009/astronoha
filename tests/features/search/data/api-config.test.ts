import { apiConfig } from "../../../../src/features/search/data/api-config";

describe("apiConfig", () => {
	it("exports all required API URLs", () => {
		expect(apiConfig).toHaveProperty("kokkai");
		expect(apiConfig).toHaveProperty("teikoku");
		expect(apiConfig).toHaveProperty("opensearch");
		expect(apiConfig).toHaveProperty("sru");
	});

	it("all URLs are valid HTTPS URLs", () => {
		for (const [key, url] of Object.entries(apiConfig)) {
			expect(url, `${key} should be a valid URL`).toMatch(/^https:\/\/.+/);
		}
	});

	it("kokkai URL points to kokkai.ndl.go.jp", () => {
		expect(apiConfig.kokkai).toContain("kokkai.ndl.go.jp");
	});

	it("teikoku URL points to teikokugikai-i.ndl.go.jp", () => {
		expect(apiConfig.teikoku).toContain("teikokugikai-i.ndl.go.jp");
	});

	it("opensearch and sru URLs point to ndlsearch.ndl.go.jp", () => {
		expect(apiConfig.opensearch).toContain("ndlsearch.ndl.go.jp");
		expect(apiConfig.sru).toContain("ndlsearch.ndl.go.jp");
	});
});
