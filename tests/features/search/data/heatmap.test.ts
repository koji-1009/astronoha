import {
	generateHeatmapBatch,
	getHeatmapData,
} from "../../../../src/features/search/data/heatmap";

// Mock ndlFetch so we don't go through real rate limiting / caching
vi.mock("../../../../src/features/search/data/ndl-fetch", () => ({
	ndlFetch: vi.fn(),
}));

import { ndlFetch as mockNdlFetch } from "../../../../src/features/search/data/ndl-fetch";

const ndlFetch = mockNdlFetch as ReturnType<typeof vi.fn>;

// ============================================================
// D1 mock helpers
// ============================================================

interface MockRow {
	[key: string]: unknown;
}

function makeD1Result<T>(rows: T[]): {
	results: T[];
	success: boolean;
	meta: Record<string, unknown>;
} {
	return { results: rows, success: true, meta: {} };
}

function createMockDb(options?: {
	allResults?: MockRow[];
	batchError?: Error;
}): D1Database {
	const allResults = options?.allResults ?? [];
	const batchError = options?.batchError;

	const mockStatement: D1PreparedStatement = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn(),
		run: vi.fn(),
		all: vi.fn().mockResolvedValue(makeD1Result(allResults)),
		raw: vi.fn(),
	};

	return {
		prepare: vi.fn().mockReturnValue(mockStatement),
		batch: batchError
			? vi.fn().mockRejectedValue(batchError)
			: vi.fn().mockResolvedValue([]),
		exec: vi.fn(),
	};
}

const apiConfig = {
	kokkai: "https://kokkai.ndl.go.jp/api",
	teikoku: "https://teikokugikai-i.ndl.go.jp/api/emp",
};

function makeSpeechResponse(count: number): Response {
	return new Response(
		JSON.stringify({
			numberOfRecords: count,
			numberOfReturn: 0,
			startRecord: 1,
		}),
		{ status: 200 },
	);
}

// ============================================================
// Setup
// ============================================================

beforeEach(() => {
	ndlFetch.mockReset();
});

// ============================================================
// getHeatmapData
// ============================================================

describe("getHeatmapData", () => {
	it("returns entries from D1 for kokkai target", async () => {
		const rows = [
			{ year: 1950, count: 10 },
			{ year: 1951, count: 20 },
		];
		const db = createMockDb({ allResults: rows });

		const result = await getHeatmapData(db, "経済", "kokkai");

		expect(result.keyword).toBe("経済");
		expect(result.target).toBe("kokkai");
		expect(result.entries).toEqual(rows);
		expect(result.populatedYears).toBe(2);
		expect(result.totalYears).toBeGreaterThan(0);
	});

	it("returns entries from D1 for teikoku target", async () => {
		const rows = [{ year: 1900, count: 5 }];
		const db = createMockDb({ allResults: rows });

		const result = await getHeatmapData(db, "予算", "teikoku");

		expect(result.keyword).toBe("予算");
		expect(result.target).toBe("teikoku");
		expect(result.entries).toEqual(rows);
		expect(result.populatedYears).toBe(1);
	});

	it("returns entries from D1 for both target", async () => {
		const rows = [
			{ year: 1900, count: 5 },
			{ year: 1950, count: 10 },
		];
		const db = createMockDb({ allResults: rows });

		const result = await getHeatmapData(db, "憲法", "both");

		expect(result.target).toBe("both");
		expect(result.entries).toEqual(rows);
		expect(result.populatedYears).toBe(2);
		// "both" includes teikoku (1890-1946) + kokkai (1947-current)
		expect(result.totalYears).toBeGreaterThan(100);
	});

	it("reports complete=false when not all years are populated", async () => {
		const rows = [{ year: 1950, count: 10 }];
		const db = createMockDb({ allResults: rows });

		const result = await getHeatmapData(db, "経済", "kokkai");

		expect(result.complete).toBe(false);
		expect(result.populatedYears).toBe(1);
		expect(result.totalYears).toBeGreaterThan(1);
	});

	it("reports complete=true when all years are populated", async () => {
		const currentYear = new Date().getFullYear();
		const rows: MockRow[] = [];
		for (let y = 1947; y <= currentYear; y++) {
			rows.push({ year: y, count: Math.floor(Math.random() * 100) });
		}
		const db = createMockDb({ allResults: rows });

		const result = await getHeatmapData(db, "経済", "kokkai");

		expect(result.complete).toBe(true);
		expect(result.populatedYears).toBe(result.totalYears);
	});

	it("handles empty D1 result", async () => {
		const db = createMockDb({ allResults: [] });

		const result = await getHeatmapData(db, "存在しない", "kokkai");

		expect(result.entries).toEqual([]);
		expect(result.populatedYears).toBe(0);
		expect(result.complete).toBe(false);
	});

	it("constructs correct SQL with both target (IN clause)", async () => {
		const db = createMockDb({ allResults: [] });

		await getHeatmapData(db, "テスト", "both");

		expect(db.prepare).toHaveBeenCalledWith(
			expect.stringContaining("IN (?, ?)"),
		);
		const mockStatement = (db.prepare as ReturnType<typeof vi.fn>).mock
			.results[0].value;
		expect(mockStatement.bind).toHaveBeenCalledWith(
			"テスト",
			"kokkai",
			"teikoku",
		);
	});

	it("constructs correct SQL with single target", async () => {
		const db = createMockDb({ allResults: [] });

		await getHeatmapData(db, "テスト", "kokkai");

		expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("IN (?)"));
		const mockStatement = (db.prepare as ReturnType<typeof vi.fn>).mock
			.results[0].value;
		expect(mockStatement.bind).toHaveBeenCalledWith("テスト", "kokkai");
	});
});

// ============================================================
// generateHeatmapBatch
// ============================================================

describe("generateHeatmapBatch", () => {
	it("returns 0 when all years are already populated", async () => {
		const currentYear = new Date().getFullYear();
		const existingPairs: MockRow[] = [];
		for (let y = 1947; y <= currentYear; y++) {
			existingPairs.push({ target: "kokkai", year: y });
		}
		const db = createMockDb({ allResults: existingPairs });

		const result = await generateHeatmapBatch(db, "経済", "kokkai", apiConfig);

		expect(result).toBe(0);
		expect(db.batch).not.toHaveBeenCalled();
	});

	it("generates a batch of missing years by calling NDL API", async () => {
		const db = createMockDb({ allResults: [] });

		ndlFetch.mockImplementation(() => Promise.resolve(makeSpeechResponse(5)));

		const result = await generateHeatmapBatch(db, "経済", "kokkai", apiConfig);

		expect(result).toBe(10);
		expect(db.batch).toHaveBeenCalledOnce();
		expect(ndlFetch).toHaveBeenCalledTimes(10);
	});

	it("uses kokkai API for years >= 1947", async () => {
		const db = createMockDb({ allResults: [] });

		ndlFetch.mockImplementation(() => Promise.resolve(makeSpeechResponse(5)));

		await generateHeatmapBatch(db, "経済", "kokkai", apiConfig);

		for (const call of ndlFetch.mock.calls) {
			expect(call[0] as string).toContain("kokkai.ndl.go.jp");
		}
	});

	it("uses teikoku API for years < 1947", async () => {
		const db = createMockDb({ allResults: [] });

		ndlFetch.mockImplementation(() => Promise.resolve(makeSpeechResponse(3)));

		await generateHeatmapBatch(db, "予算", "teikoku", apiConfig);

		for (const call of ndlFetch.mock.calls) {
			expect(call[0] as string).toContain("teikokugikai-i.ndl.go.jp");
		}
	});

	it("inserts correct data via D1 batch", async () => {
		// Only 1 missing year
		const currentYear = new Date().getFullYear();
		const existingPairs: MockRow[] = [];
		for (let y = 1947; y < currentYear; y++) {
			existingPairs.push({ target: "kokkai", year: y });
		}
		const db = createMockDb({ allResults: existingPairs });

		ndlFetch.mockImplementation(() => Promise.resolve(makeSpeechResponse(42)));

		const result = await generateHeatmapBatch(db, "経済", "kokkai", apiConfig);

		expect(result).toBe(1);
		expect(db.batch).toHaveBeenCalledOnce();

		const prepareCalls = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
		const insertCalls = prepareCalls.filter(
			(call: string[]) =>
				typeof call[0] === "string" && call[0].includes("INSERT"),
		);
		expect(insertCalls.length).toBe(1);
	});

	it("stores count=0 when API returns HTTP error", async () => {
		const db = createMockDb({ allResults: [] });

		ndlFetch.mockImplementation(() =>
			Promise.resolve(new Response(null, { status: 500 })),
		);

		const result = await generateHeatmapBatch(db, "経済", "kokkai", apiConfig);

		expect(result).toBe(10);
		expect(db.batch).toHaveBeenCalledOnce();
	});

	it("throws when D1 batch insert fails", async () => {
		const db = createMockDb({
			allResults: [],
			batchError: new Error("D1 write error"),
		});

		ndlFetch.mockImplementation(() => Promise.resolve(makeSpeechResponse(5)));

		await expect(
			generateHeatmapBatch(db, "経済", "kokkai", apiConfig),
		).rejects.toThrow("Heatmap D1 batch insert failed: D1 write error");
	});

	it("constructs correct fetch URL with year range", async () => {
		const db = createMockDb({ allResults: [] });

		ndlFetch.mockImplementation(() => Promise.resolve(makeSpeechResponse(0)));

		await generateHeatmapBatch(db, "憲法", "kokkai", apiConfig);

		// First call should be for 1947 (earliest kokkai year)
		const firstUrl = ndlFetch.mock.calls[0][0] as string;
		expect(firstUrl).toContain("any=%E6%86%B2%E6%B3%95"); // 憲法 encoded
		expect(firstUrl).toContain("from=1947-01-01");
		expect(firstUrl).toContain("until=1947-12-31");
		expect(firstUrl).toContain("maximumRecords=1");
	});

	it("limits batch size to 10", async () => {
		const db = createMockDb({ allResults: [] });

		ndlFetch.mockImplementation(() => Promise.resolve(makeSpeechResponse(0)));

		const result = await generateHeatmapBatch(db, "経済", "kokkai", apiConfig);

		expect(result).toBe(10);
		expect(ndlFetch).toHaveBeenCalledTimes(10);
	});

	it("handles Zod validation failure gracefully (returns count 0)", async () => {
		const db = createMockDb({ allResults: [] });

		// Return valid HTTP but invalid schema
		ndlFetch.mockImplementation(() =>
			Promise.resolve(
				new Response(JSON.stringify({ invalid: "data" }), { status: 200 }),
			),
		);

		const result = await generateHeatmapBatch(db, "経済", "kokkai", apiConfig);

		// safeParse returns success=false → count=0
		expect(result).toBe(10);
		expect(db.batch).toHaveBeenCalledOnce();
	});

	it("constructs URLs for teikoku starting at 1890", async () => {
		const db = createMockDb({ allResults: [] });

		ndlFetch.mockImplementation(() => Promise.resolve(makeSpeechResponse(0)));

		await generateHeatmapBatch(db, "予算", "teikoku", apiConfig);

		const firstUrl = ndlFetch.mock.calls[0][0] as string;
		expect(firstUrl).toContain("from=1890-01-01");
		expect(firstUrl).toContain("until=1890-12-31");
	});

	it("re-fetches current year data when stale (older than 12 hours)", async () => {
		const currentYear = new Date().getFullYear();
		// D1 datetime('now') format: "YYYY-MM-DD HH:MM:SS" (UTC, no Z suffix)
		const toD1DateTime = (date: Date) =>
			date
				.toISOString()
				.replace("T", " ")
				.replace(/\.\d+Z$/, "");
		const staleDate = toD1DateTime(new Date(Date.now() - 24 * 60 * 60 * 1000));
		const freshDate = toD1DateTime(new Date());
		// All years populated, but current year has stale created_at
		const existingPairs: MockRow[] = [];
		for (let y = 1947; y <= currentYear; y++) {
			existingPairs.push({
				target: "kokkai",
				year: y,
				created_at: y === currentYear ? staleDate : freshDate,
			});
		}
		const db = createMockDb({ allResults: existingPairs });

		ndlFetch.mockImplementation(() => Promise.resolve(makeSpeechResponse(99)));

		const result = await generateHeatmapBatch(db, "経済", "kokkai", apiConfig);

		// Should re-fetch exactly 1 year (the stale current year)
		expect(result).toBe(1);
		expect(ndlFetch).toHaveBeenCalledOnce();

		const url = ndlFetch.mock.calls[0][0] as string;
		expect(url).toContain(`from=${currentYear}-01-01`);
		expect(url).toContain(`until=${currentYear}-12-31`);
	});

	it("does not re-fetch current year data when fresh", async () => {
		const currentYear = new Date().getFullYear();
		const toD1DateTime = (date: Date) =>
			date
				.toISOString()
				.replace("T", " ")
				.replace(/\.\d+Z$/, "");
		const freshDate = toD1DateTime(new Date());
		const existingPairs: MockRow[] = [];
		for (let y = 1947; y <= currentYear; y++) {
			existingPairs.push({
				target: "kokkai",
				year: y,
				created_at: freshDate,
			});
		}
		const db = createMockDb({ allResults: existingPairs });

		const result = await generateHeatmapBatch(db, "経済", "kokkai", apiConfig);

		// Nothing to re-fetch
		expect(result).toBe(0);
		expect(ndlFetch).not.toHaveBeenCalled();
	});
});
