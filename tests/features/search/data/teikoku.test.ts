import { readFileSync } from "node:fs";
import { join } from "node:path";
import { _resetRateLimitTimer } from "../../../../src/features/search/data/ndl-fetch";
import {
	_buildParams,
	_getBaseUrl,
	getSpeechById,
	searchSpeeches,
} from "../../../../src/features/search/data/teikoku";

const fixturesDir = join(__dirname, "../../../fixtures");

const speechFixture = JSON.parse(
	readFileSync(join(fixturesDir, "teikoku-speech-response.json"), "utf-8"),
);

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
	mockFetch.mockReset();
	_resetRateLimitTimer();
});

describe("teikoku URL construction", () => {
	it("uses correct base URL with /emp/ prefix", () => {
		expect(_getBaseUrl()).toBe("https://teikokugikai-i.ndl.go.jp/api/emp");
	});

	it("builds params with keyword", () => {
		const params = _buildParams({ keyword: "普通選挙" });
		expect(params.get("recordPacking")).toBe("json");
		expect(params.get("any")).toBe("普通選挙");
	});

	it("builds params with date range", () => {
		const params = _buildParams({
			from: "1890-01-01",
			until: "1947-05-03",
		});
		expect(params.get("from")).toBe("1890-01-01");
		expect(params.get("until")).toBe("1947-05-03");
	});

	it("builds params with speaker", () => {
		const params = _buildParams({ speaker: "加藤高明" });
		expect(params.get("speaker")).toBe("加藤高明");
	});

	it("builds params with nameOfHouse", () => {
		const params = _buildParams({ nameOfHouse: "貴族院" });
		expect(params.get("nameOfHouse")).toBe("貴族院");
	});

	it("builds params with pagination", () => {
		const params = _buildParams({
			maximumRecords: 5,
			startRecord: 6,
		});
		expect(params.get("maximumRecords")).toBe("5");
		expect(params.get("startRecord")).toBe("6");
	});

	it("omits undefined parameters", () => {
		const params = _buildParams({});
		expect(params.get("any")).toBeNull();
		expect(params.get("from")).toBeNull();
		expect(params.get("recordPacking")).toBe("json");
	});
});

describe("searchSpeeches", () => {
	it("fetches and parses a valid speech response", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(speechFixture), { status: 200 }),
		);

		const result = await searchSpeeches({ keyword: "普通選挙" });

		expect(mockFetch).toHaveBeenCalledOnce();
		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("teikokugikai-i.ndl.go.jp/api/emp/speech");
		expect(calledUrl).toContain("recordPacking=json");

		expect(result.numberOfRecords).toBe(18);
		expect(result.speechRecord).toHaveLength(1);
		expect(result.speechRecord?.[0].speaker).toBe("加藤高明");
		expect(result.speechRecord?.[0].nameOfHouse).toBe("貴族院");
	});

	it("handles zero results", async () => {
		const emptyResponse = {
			numberOfRecords: 0,
			numberOfReturn: 0,
			startRecord: 1,
		};
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(emptyResponse), { status: 200 }),
		);

		const result = await searchSpeeches({
			keyword: "存在しないキーワード",
		});
		expect(result.numberOfRecords).toBe(0);
		expect(result.speechRecord).toBeUndefined();
	});

	it("throws on HTTP error", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(null, {
				status: 500,
				statusText: "Internal Server Error",
			}),
		);

		await expect(searchSpeeches({ keyword: "テスト" })).rejects.toThrow(
			"Imperial Diet API speech request failed: 500 Internal Server Error",
		);
	});

	// Note: Zod validation removed for speech JSON responses (Workers 10ms CPU limit).
	// Malformed JSON data is handled via type assertions, so invalid fields
	// will surface as runtime errors in consuming code rather than Zod errors.
});

describe("getSpeechById", () => {
	it("fetches a speech by ID", async () => {
		const singleSpeechResponse = {
			numberOfRecords: 1,
			numberOfReturn: 1,
			startRecord: 1,
			speechRecord: [speechFixture.speechRecord[0]],
		};
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(singleSpeechResponse), { status: 200 }),
		);

		const result = await getSpeechById("005103242X00219260121_006");

		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("teikokugikai-i.ndl.go.jp/api/emp/speech");
		expect(calledUrl).toContain("speechID=005103242X00219260121_006");
		expect(calledUrl).toContain("recordPacking=json");

		expect(result.numberOfRecords).toBe(1);
		expect(result.speechRecord?.[0].speaker).toBe("加藤高明");
	});

	it("throws on HTTP 404", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(null, { status: 404, statusText: "Not Found" }),
		);

		await expect(getSpeechById("nonexistent")).rejects.toThrow(
			"Imperial Diet API speech request failed: 404 Not Found",
		);
	});
});
