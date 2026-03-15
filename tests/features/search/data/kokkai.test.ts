import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	_buildParams,
	_getBaseUrl,
	getSpeechById,
	searchSpeeches,
} from "../../../../src/features/search/data/kokkai";
import { _resetRateLimitTimer } from "../../../../src/features/search/data/ndl-fetch";

const fixturesDir = join(__dirname, "../../../fixtures");

const speechFixture = JSON.parse(
	readFileSync(join(fixturesDir, "kokkai-speech-response.json"), "utf-8"),
);
// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
	mockFetch.mockReset();
	_resetRateLimitTimer();
});

describe("kokkai URL construction", () => {
	it("uses correct base URL", () => {
		expect(_getBaseUrl()).toBe("https://kokkai.ndl.go.jp/api");
	});

	it("builds params with keyword", () => {
		const params = _buildParams({ keyword: "憲法" });
		expect(params.get("recordPacking")).toBe("json");
		expect(params.get("any")).toBe("憲法");
	});

	it("builds params with date range", () => {
		const params = _buildParams({
			from: "2020-01-01",
			until: "2024-12-31",
		});
		expect(params.get("from")).toBe("2020-01-01");
		expect(params.get("until")).toBe("2024-12-31");
	});

	it("builds params with speaker", () => {
		const params = _buildParams({ speaker: "山田太郎" });
		expect(params.get("speaker")).toBe("山田太郎");
	});

	it("builds params with nameOfHouse", () => {
		const params = _buildParams({ nameOfHouse: "衆議院" });
		expect(params.get("nameOfHouse")).toBe("衆議院");
	});

	it("builds params with pagination", () => {
		const params = _buildParams({
			maximumRecords: 10,
			startRecord: 11,
		});
		expect(params.get("maximumRecords")).toBe("10");
		expect(params.get("startRecord")).toBe("11");
	});

	it("omits undefined parameters", () => {
		const params = _buildParams({});
		expect(params.get("any")).toBeNull();
		expect(params.get("from")).toBeNull();
		expect(params.get("speaker")).toBeNull();
		// recordPacking is always present
		expect(params.get("recordPacking")).toBe("json");
	});

	it("builds params with all fields", () => {
		const params = _buildParams({
			keyword: "予算",
			from: "2023-01-01",
			until: "2023-12-31",
			speaker: "佐藤花子",
			nameOfHouse: "参議院",
			maximumRecords: 20,
			startRecord: 5,
		});
		expect(params.get("any")).toBe("予算");
		expect(params.get("from")).toBe("2023-01-01");
		expect(params.get("until")).toBe("2023-12-31");
		expect(params.get("speaker")).toBe("佐藤花子");
		expect(params.get("nameOfHouse")).toBe("参議院");
		expect(params.get("maximumRecords")).toBe("20");
		expect(params.get("startRecord")).toBe("5");
	});
});

describe("searchSpeeches", () => {
	it("fetches and parses a valid speech response", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(speechFixture), { status: 200 }),
		);

		const result = await searchSpeeches({ keyword: "経済" });

		expect(mockFetch).toHaveBeenCalledOnce();
		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("kokkai.ndl.go.jp/api/speech");
		expect(calledUrl).toContain("recordPacking=json");
		expect(calledUrl).toContain("any=%E7%B5%8C%E6%B8%88");

		expect(result.numberOfRecords).toBe(182725);
		expect(result.speechRecord).toHaveLength(2);
		expect(result.speechRecord?.[0].speaker).toBe("菅原晶子");
		expect(result.speechRecord?.[1].speaker).toBe("会議録情報");
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
			"National Diet API speech request failed: 500 Internal Server Error",
		);
	});

	it("throws on malformed response data (Zod validation failure)", async () => {
		const malformedData = {
			numberOfRecords: "not a number", // should be number
			numberOfReturn: 0,
			startRecord: 1,
		};
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(malformedData), { status: 200 }),
		);

		await expect(searchSpeeches({ keyword: "テスト" })).rejects.toThrow();
	});

	it("throws on invalid speech record fields", async () => {
		const invalidRecord = {
			numberOfRecords: 1,
			numberOfReturn: 1,
			startRecord: 1,
			speechRecord: [
				{
					speechID: 12345, // should be string
					// missing required fields
				},
			],
		};
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(invalidRecord), { status: 200 }),
		);

		await expect(searchSpeeches({ keyword: "テスト" })).rejects.toThrow();
	});
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

		const result = await getSpeechById("122104024X00620260303_054");

		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("kokkai.ndl.go.jp/api/speech");
		expect(calledUrl).toContain("speechID=122104024X00620260303_054");
		expect(calledUrl).toContain("recordPacking=json");

		expect(result.numberOfRecords).toBe(1);
		expect(result.speechRecord?.[0].speechID).toBe("122104024X00620260303_054");
	});

	it("throws on HTTP 404", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(null, { status: 404, statusText: "Not Found" }),
		);

		await expect(getSpeechById("nonexistent")).rejects.toThrow(
			"National Diet API speech request failed: 404 Not Found",
		);
	});
});
