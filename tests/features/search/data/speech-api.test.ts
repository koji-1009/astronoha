import { readFileSync } from "node:fs";
import { join } from "node:path";
import { _resetRateLimitTimer } from "../../../../src/features/search/data/ndl-fetch";
import {
	buildSpeechParams,
	fetchSpeechById,
	fetchSpeeches,
} from "../../../../src/features/search/data/speech-api";

const fixturesDir = join(__dirname, "../../../fixtures");

const speechFixture = JSON.parse(
	readFileSync(join(fixturesDir, "kokkai-speech-response.json"), "utf-8"),
);

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
	mockFetch.mockReset();
	_resetRateLimitTimer();
});

describe("buildSpeechParams", () => {
	it("always sets recordPacking=json", () => {
		const params = buildSpeechParams({});
		expect(params.get("recordPacking")).toBe("json");
	});

	it("sets keyword as 'any' param", () => {
		const params = buildSpeechParams({ keyword: "憲法" });
		expect(params.get("any")).toBe("憲法");
	});

	it("sets date range params", () => {
		const params = buildSpeechParams({
			from: "2020-01-01",
			until: "2024-12-31",
		});
		expect(params.get("from")).toBe("2020-01-01");
		expect(params.get("until")).toBe("2024-12-31");
	});

	it("sets speaker param", () => {
		const params = buildSpeechParams({ speaker: "山田太郎" });
		expect(params.get("speaker")).toBe("山田太郎");
	});

	it("sets nameOfHouse param", () => {
		const params = buildSpeechParams({ nameOfHouse: "衆議院" });
		expect(params.get("nameOfHouse")).toBe("衆議院");
	});

	it("sets pagination params as strings", () => {
		const params = buildSpeechParams({
			maximumRecords: 10,
			startRecord: 21,
		});
		expect(params.get("maximumRecords")).toBe("10");
		expect(params.get("startRecord")).toBe("21");
	});

	it("omits undefined parameters", () => {
		const params = buildSpeechParams({});
		expect(params.get("any")).toBeNull();
		expect(params.get("from")).toBeNull();
		expect(params.get("until")).toBeNull();
		expect(params.get("speaker")).toBeNull();
		expect(params.get("nameOfHouse")).toBeNull();
		expect(params.get("maximumRecords")).toBeNull();
		expect(params.get("startRecord")).toBeNull();
	});

	it("sets all params together", () => {
		const params = buildSpeechParams({
			keyword: "予算",
			from: "2023-01-01",
			until: "2023-12-31",
			speaker: "佐藤花子",
			nameOfHouse: "参議院",
			maximumRecords: 20,
			startRecord: 5,
		});
		expect(params.get("recordPacking")).toBe("json");
		expect(params.get("any")).toBe("予算");
		expect(params.get("from")).toBe("2023-01-01");
		expect(params.get("until")).toBe("2023-12-31");
		expect(params.get("speaker")).toBe("佐藤花子");
		expect(params.get("nameOfHouse")).toBe("参議院");
		expect(params.get("maximumRecords")).toBe("20");
		expect(params.get("startRecord")).toBe("5");
	});
});

describe("fetchSpeeches", () => {
	it("constructs URL from baseUrl and params", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(speechFixture), { status: 200 }),
		);

		await fetchSpeeches("https://example.com/api", "Test API", {
			keyword: "経済",
		});

		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("example.com/api/speech");
		expect(calledUrl).toContain("recordPacking=json");
		expect(calledUrl).toContain("any=%E7%B5%8C%E6%B8%88");
	});

	it("parses valid speech response via Zod", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(speechFixture), { status: 200 }),
		);

		const result = await fetchSpeeches("https://example.com/api", "Test API", {
			keyword: "経済",
		});
		expect(result.numberOfRecords).toBe(182725);
		expect(result.speechRecord).toHaveLength(2);
	});

	it("throws with API name on HTTP error", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(null, {
				status: 503,
				statusText: "Service Unavailable",
			}),
		);

		await expect(
			fetchSpeeches("https://example.com/api", "My API", {
				keyword: "テスト",
			}),
		).rejects.toThrow("My API speech request failed: 503 Service Unavailable");
	});

	it("throws with API name on invalid JSON", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response("<html>not json</html>", {
				status: 200,
				headers: { "Content-Type": "text/html" },
			}),
		);

		await expect(
			fetchSpeeches("https://example.com/api", "Broken API", {
				keyword: "テスト",
			}),
		).rejects.toThrow(
			"Broken API returned invalid JSON (expected JSON response, got non-JSON content)",
		);
	});

	it("throws on Zod validation failure", async () => {
		const malformedData = {
			numberOfRecords: "not a number",
			numberOfReturn: 0,
			startRecord: 1,
		};
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(malformedData), { status: 200 }),
		);

		await expect(
			fetchSpeeches("https://example.com/api", "Test API", {
				keyword: "テスト",
			}),
		).rejects.toThrow();
	});
});

describe("fetchSpeechById", () => {
	it("constructs URL with speechID param", async () => {
		const singleSpeechResponse = {
			numberOfRecords: 1,
			numberOfReturn: 1,
			startRecord: 1,
			speechRecord: [speechFixture.speechRecord[0]],
		};
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(singleSpeechResponse), { status: 200 }),
		);

		await fetchSpeechById(
			"https://example.com/api",
			"Test API",
			"122104024X00620260303_054",
		);

		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("example.com/api/speech");
		expect(calledUrl).toContain("speechID=122104024X00620260303_054");
		expect(calledUrl).toContain("recordPacking=json");
		// Should NOT contain 'any' param
		expect(calledUrl).not.toContain("any=");
	});

	it("parses response and returns result", async () => {
		const singleSpeechResponse = {
			numberOfRecords: 1,
			numberOfReturn: 1,
			startRecord: 1,
			speechRecord: [speechFixture.speechRecord[0]],
		};
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(singleSpeechResponse), { status: 200 }),
		);

		const result = await fetchSpeechById(
			"https://example.com/api",
			"Test API",
			"122104024X00620260303_054",
		);
		expect(result.numberOfRecords).toBe(1);
		expect(result.speechRecord?.[0].speechID).toBe("122104024X00620260303_054");
	});

	it("throws with API name on HTTP error", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(null, { status: 404, statusText: "Not Found" }),
		);

		await expect(
			fetchSpeechById("https://example.com/api", "Custom API", "nonexistent"),
		).rejects.toThrow("Custom API speech request failed: 404 Not Found");
	});

	it("throws with API name on invalid JSON", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response("not json at all", {
				status: 200,
				headers: { "Content-Type": "text/plain" },
			}),
		);

		await expect(
			fetchSpeechById("https://example.com/api", "Bad API", "some-id"),
		).rejects.toThrow(
			"Bad API returned invalid JSON (expected JSON response, got non-JSON content)",
		);
	});
});
