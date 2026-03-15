import type {
	NdlBook,
	NdlSearchResponse,
	SpeechRecord,
	SpeechResponse,
} from "../../../../src/features/search/data/schemas";
import {
	getAvailablePeriods,
	getTimelineData,
	mergeTimelineEntries,
	parsePeriod,
} from "../../../../src/features/timeline/data/timeline";

// ============================================================
// Mock the search data clients
// ============================================================

vi.mock("../../../../src/features/search/data/kokkai", () => ({
	searchSpeeches: vi.fn(),
}));

vi.mock("../../../../src/features/search/data/teikoku", () => ({
	searchSpeeches: vi.fn(),
}));

vi.mock("../../../../src/features/search/data/ndl-search", () => ({
	searchBooksByYear: vi.fn(),
}));

// Import mocked modules
const { searchSpeeches: mockKokkaiSearch } = await import(
	"../../../../src/features/search/data/kokkai"
);
const { searchSpeeches: mockTeikokuSearch } = await import(
	"../../../../src/features/search/data/teikoku"
);
const { searchBooksByYear: mockSearchBooksByYear } = await import(
	"../../../../src/features/search/data/ndl-search"
);

const kokkaiSearch = vi.mocked(mockKokkaiSearch);
const teikokuSearch = vi.mocked(mockTeikokuSearch);
const searchBooksByYear = vi.mocked(mockSearchBooksByYear);

// ============================================================
// Test fixtures
// ============================================================

function makeSpeech(overrides: Partial<SpeechRecord> = {}): SpeechRecord {
	return {
		speechID: "121004005X01020240131001",
		issueID: "121004005X01020240131",
		nameOfHouse: "衆議院",
		nameOfMeeting: "本会議",
		issue: "第10号",
		date: "2024-01-31",
		speech: "経済に関する発言です。",
		speaker: "山田太郎",
		speechURL: "https://kokkai.ndl.go.jp/txt/121004005X01020240131/001",
		meetingURL: "https://kokkai.ndl.go.jp/txt/121004005X01020240131",
		...overrides,
	};
}

function makeBook(overrides: Partial<NdlBook> = {}): NdlBook {
	return {
		title: "経済学入門",
		link: "https://ndlsearch.ndl.go.jp/books/R100000001-I12345",
		author: "田中一郎",
		publisher: "岩波書店",
		description: "経済学の基礎を解説",
		date: "2024-01-15",
		identifier: "978-4-00-000001-1",
		...overrides,
	};
}

function makeSpeechResponse(
	speeches: SpeechRecord[],
	total?: number,
): SpeechResponse {
	return {
		numberOfRecords: total ?? speeches.length,
		numberOfReturn: speeches.length,
		startRecord: 1,
		speechRecord: speeches.length > 0 ? speeches : undefined,
	};
}

function makeBookResponse(books: NdlBook[], total?: number): NdlSearchResponse {
	return {
		totalResults: total ?? books.length,
		startIndex: 1,
		itemsPerPage: books.length,
		items: books,
	};
}

// ============================================================
// Reset mocks between tests
// ============================================================

beforeEach(() => {
	kokkaiSearch.mockReset();
	teikokuSearch.mockReset();
	searchBooksByYear.mockReset();
});

// ============================================================
// parsePeriod
// ============================================================

describe("parsePeriod", () => {
	it("correctly parses '2024-01' into from/until dates", () => {
		const result = parsePeriod("2024-01");
		expect(result.from).toBe("2024-01-01");
		expect(result.until).toBe("2024-01-31");
		expect(result.year).toBe(2024);
		expect(result.month).toBe(1);
	});

	it("handles December correctly (31 days)", () => {
		const result = parsePeriod("2024-12");
		expect(result.from).toBe("2024-12-01");
		expect(result.until).toBe("2024-12-31");
		expect(result.year).toBe(2024);
		expect(result.month).toBe(12);
	});

	it("handles February in a leap year (29 days)", () => {
		const result = parsePeriod("2024-02");
		expect(result.from).toBe("2024-02-01");
		expect(result.until).toBe("2024-02-29");
		expect(result.year).toBe(2024);
		expect(result.month).toBe(2);
	});

	it("handles February in a non-leap year (28 days)", () => {
		const result = parsePeriod("2023-02");
		expect(result.from).toBe("2023-02-01");
		expect(result.until).toBe("2023-02-28");
		expect(result.year).toBe(2023);
		expect(result.month).toBe(2);
	});

	it("handles April (30 days)", () => {
		const result = parsePeriod("2024-04");
		expect(result.from).toBe("2024-04-01");
		expect(result.until).toBe("2024-04-30");
	});

	it("handles historical dates (Meiji era)", () => {
		const result = parsePeriod("1890-11");
		expect(result.from).toBe("1890-11-01");
		expect(result.until).toBe("1890-11-30");
		expect(result.year).toBe(1890);
		expect(result.month).toBe(11);
	});

	it("throws on invalid input 'invalid'", () => {
		expect(() => parsePeriod("invalid")).toThrow(
			'Invalid period format: "invalid". Expected "YYYY-MM".',
		);
	});

	it("throws on incomplete format '2024'", () => {
		expect(() => parsePeriod("2024")).toThrow(
			'Invalid period format: "2024". Expected "YYYY-MM".',
		);
	});

	it("throws on invalid month '2024-13'", () => {
		expect(() => parsePeriod("2024-13")).toThrow(
			'Invalid month in period: "2024-13". Month must be between 01 and 12.',
		);
	});

	it("throws on month zero '2024-00'", () => {
		expect(() => parsePeriod("2024-00")).toThrow(
			'Invalid month in period: "2024-00". Month must be between 01 and 12.',
		);
	});

	it("throws on extra characters '2024-01-01'", () => {
		expect(() => parsePeriod("2024-01-01")).toThrow(
			'Invalid period format: "2024-01-01". Expected "YYYY-MM".',
		);
	});

	it("throws on empty string", () => {
		expect(() => parsePeriod("")).toThrow(
			'Invalid period format: "". Expected "YYYY-MM".',
		);
	});
});

// ============================================================
// mergeTimelineEntries
// ============================================================

describe("mergeTimelineEntries", () => {
	it("merges speeches and books sorted by date ascending", () => {
		const speeches = [
			makeSpeech({ date: "2024-01-20", speaker: "議員A" }),
			makeSpeech({ date: "2024-01-10", speaker: "議員B" }),
		];
		const books = [
			makeBook({ date: "2024-01-15", title: "本A" }),
			makeBook({ date: "2024-01-25", title: "本B" }),
		];

		const entries = mergeTimelineEntries(speeches, books);

		expect(entries).toHaveLength(4);
		expect(entries[0].date).toBe("2024-01-10");
		expect(entries[0].type).toBe("speech");
		expect(entries[1].date).toBe("2024-01-15");
		expect(entries[1].type).toBe("publication");
		expect(entries[2].date).toBe("2024-01-20");
		expect(entries[2].type).toBe("speech");
		expect(entries[3].date).toBe("2024-01-25");
		expect(entries[3].type).toBe("publication");
	});

	it("handles empty speeches array", () => {
		const books = [
			makeBook({ date: "2024-01-15", title: "本A" }),
			makeBook({ date: "2024-01-05", title: "本B" }),
		];

		const entries = mergeTimelineEntries([], books);

		expect(entries).toHaveLength(2);
		expect(entries[0].date).toBe("2024-01-05");
		expect(entries[0].type).toBe("publication");
		expect(entries[1].date).toBe("2024-01-15");
		expect(entries[1].type).toBe("publication");
	});

	it("handles empty books array", () => {
		const speeches = [
			makeSpeech({ date: "2024-01-20" }),
			makeSpeech({ date: "2024-01-10" }),
		];

		const entries = mergeTimelineEntries(speeches, []);

		expect(entries).toHaveLength(2);
		expect(entries[0].date).toBe("2024-01-10");
		expect(entries[1].date).toBe("2024-01-20");
		expect(entries.every((e) => e.type === "speech")).toBe(true);
	});

	it("handles both empty arrays", () => {
		const entries = mergeTimelineEntries([], []);
		expect(entries).toHaveLength(0);
	});

	it("handles entries with the same date", () => {
		const speeches = [
			makeSpeech({
				date: "2024-01-15",
				speechID: "speech1",
				speaker: "議員A",
			}),
		];
		const books = [makeBook({ date: "2024-01-15", title: "本A" })];

		const entries = mergeTimelineEntries(speeches, books);

		expect(entries).toHaveLength(2);
		// Both have the same date; order is stable (speech comes first since it was added first)
		expect(entries[0].date).toBe("2024-01-15");
		expect(entries[1].date).toBe("2024-01-15");
	});

	it("places entries with missing dates at the end", () => {
		const speeches = [makeSpeech({ date: "2024-01-15" })];
		const books = [
			makeBook({ date: undefined, title: "日付なしの本" }),
			makeBook({ date: "2024-01-10", title: "日付ありの本" }),
		];

		const entries = mergeTimelineEntries(speeches, books);

		expect(entries).toHaveLength(3);
		expect(entries[0].date).toBe("2024-01-10");
		expect(entries[1].date).toBe("2024-01-15");
		expect(entries[2].date).toBe("");
		expect(entries[2].title).toBe("日付なしの本");
	});

	it("maps speech fields correctly", () => {
		const speech = makeSpeech({
			speechID: "test-speech-id",
			nameOfHouse: "参議院",
			nameOfMeeting: "予算委員会",
			issue: "第5号",
			speaker: "鈴木一郎",
			date: "2024-01-20",
		});

		const entries = mergeTimelineEntries([speech], []);

		expect(entries[0]).toEqual({
			type: "speech",
			date: "2024-01-20",
			title: "予算委員会 第5号",
			speechId: "test-speech-id",
			speaker: "鈴木一郎",
			house: "参議院",
		});
	});

	it("maps book fields correctly", () => {
		const book = makeBook({
			title: "日本経済史",
			author: "高橋太郎",
			publisher: "東京大学出版会",
			link: "https://example.com/book",
			identifier: "978-4-00-000001-1",
			date: "2024-01-05",
		});

		const entries = mergeTimelineEntries([], [book]);

		expect(entries[0]).toEqual({
			type: "publication",
			date: "2024-01-05",
			title: "日本経済史",
			author: "高橋太郎",
			publisher: "東京大学出版会",
			link: "https://example.com/book",
			identifier: "978-4-00-000001-1",
		});
	});
});

// ============================================================
// getTimelineData
// ============================================================

describe("getTimelineData", () => {
	it("calls APIs sequentially with correct params", async () => {
		const callOrder: string[] = [];

		kokkaiSearch.mockImplementation(async () => {
			callOrder.push("kokkai");
			return makeSpeechResponse([]);
		});
		teikokuSearch.mockImplementation(async () => {
			callOrder.push("teikoku");
			return makeSpeechResponse([]);
		});
		searchBooksByYear.mockImplementation(async () => {
			callOrder.push("ndl-search");
			return makeBookResponse([]);
		});

		await getTimelineData("経済", "2024-01");

		// Verify sequential call order
		expect(callOrder).toEqual(["kokkai", "teikoku", "ndl-search"]);

		// Verify kokkai was called with correct params
		expect(kokkaiSearch).toHaveBeenCalledWith({
			keyword: "経済",
			from: "2024-01-01",
			until: "2024-01-31",
			maximumRecords: 100,
		});

		// Verify teikoku was called with correct params
		expect(teikokuSearch).toHaveBeenCalledWith({
			keyword: "経済",
			from: "2024-01-01",
			until: "2024-01-31",
			maximumRecords: 100,
		});

		// Verify NDL search was called with correct params
		expect(searchBooksByYear).toHaveBeenCalledWith("経済", 2024, 2024, {
			count: 100,
		});
	});

	it("aggregates results correctly", async () => {
		const kokkaiSpeeches = [
			makeSpeech({
				date: "2024-01-31",
				speechID: "kokkai-1",
				speaker: "山田太郎",
			}),
		];
		const teikokuSpeeches = [
			makeSpeech({
				date: "2024-01-15",
				speechID: "teikoku-1",
				speaker: "加藤高明",
				nameOfHouse: "貴族院",
			}),
		];
		const books = [makeBook({ date: "2024-01-20", title: "経済学入門" })];

		kokkaiSearch.mockResolvedValue(makeSpeechResponse(kokkaiSpeeches, 5));
		teikokuSearch.mockResolvedValue(makeSpeechResponse(teikokuSpeeches, 3));
		searchBooksByYear.mockResolvedValue(makeBookResponse(books, 10));

		const result = await getTimelineData("経済", "2024-01");

		expect(result.keyword).toBe("経済");
		expect(result.period).toBe("2024-01");
		expect(result.from).toBe("2024-01-01");
		expect(result.until).toBe("2024-01-31");
		expect(result.totalSpeeches).toBe(8); // 5 kokkai + 3 teikoku
		expect(result.totalPublications).toBe(10);
		expect(result.entries).toHaveLength(3);

		// Verify entries are sorted by date ascending
		expect(result.entries[0].date).toBe("2024-01-15");
		expect(result.entries[0].type).toBe("speech");
		expect(result.entries[1].date).toBe("2024-01-20");
		expect(result.entries[1].type).toBe("publication");
		expect(result.entries[2].date).toBe("2024-01-31");
		expect(result.entries[2].type).toBe("speech");
	});

	it("handles empty results from all APIs", async () => {
		kokkaiSearch.mockResolvedValue(makeSpeechResponse([]));
		teikokuSearch.mockResolvedValue(makeSpeechResponse([]));
		searchBooksByYear.mockResolvedValue(makeBookResponse([]));

		const result = await getTimelineData("存在しない言葉", "2024-01");

		expect(result.entries).toHaveLength(0);
		expect(result.totalSpeeches).toBe(0);
		expect(result.totalPublications).toBe(0);
		expect(result.warnings).toHaveLength(0);
	});

	it("handles kokkai API error with warning", async () => {
		kokkaiSearch.mockRejectedValue(
			new Error(
				"National Diet API speech request failed: 500 Internal Server Error",
			),
		);
		teikokuSearch.mockResolvedValue(makeSpeechResponse([]));
		searchBooksByYear.mockResolvedValue(makeBookResponse([]));

		const result = await getTimelineData("テスト", "2024-01");

		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain("国会会議録の取得に失敗しました");
	});

	it("handles teikoku API error with warning", async () => {
		kokkaiSearch.mockResolvedValue(makeSpeechResponse([]));
		teikokuSearch.mockRejectedValue(
			new Error(
				"Imperial Diet API speech request failed: 503 Service Unavailable",
			),
		);
		searchBooksByYear.mockResolvedValue(makeBookResponse([]));

		const result = await getTimelineData("テスト", "2024-01");

		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain("帝国議会会議録の取得に失敗しました");
	});

	it("handles NDL Search API error with warning", async () => {
		kokkaiSearch.mockResolvedValue(makeSpeechResponse([]));
		teikokuSearch.mockResolvedValue(makeSpeechResponse([]));
		searchBooksByYear.mockRejectedValue(
			new Error("NDL Search SRU API request failed: 500 Internal Server Error"),
		);

		const result = await getTimelineData("テスト", "2024-01");

		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain("出版物の取得に失敗しました");
	});

	it("returns partial data when some APIs fail", async () => {
		const speeches = [makeSpeech({ date: "2024-01-15", speechID: "k-1" })];
		kokkaiSearch.mockResolvedValue(makeSpeechResponse(speeches, 1));
		teikokuSearch.mockRejectedValue(new Error("Service Unavailable"));
		searchBooksByYear.mockRejectedValue(new Error("Timeout"));

		const result = await getTimelineData("テスト", "2024-01");

		expect(result.entries).toHaveLength(1);
		expect(result.totalSpeeches).toBe(1);
		expect(result.totalPublications).toBe(0);
		expect(result.warnings).toHaveLength(2);
	});

	it("throws on invalid period format", async () => {
		await expect(getTimelineData("テスト", "invalid")).rejects.toThrow(
			"Invalid period format",
		);
	});

	it("passes correct year for book search with historical period", async () => {
		kokkaiSearch.mockResolvedValue(makeSpeechResponse([]));
		teikokuSearch.mockResolvedValue(makeSpeechResponse([]));
		searchBooksByYear.mockResolvedValue(makeBookResponse([]));

		await getTimelineData("普通選挙", "1925-03");

		expect(searchBooksByYear).toHaveBeenCalledWith("普通選挙", 1925, 1925, {
			count: 100,
		});

		expect(kokkaiSearch).toHaveBeenCalledWith({
			keyword: "普通選挙",
			from: "1925-03-01",
			until: "1925-03-31",
			maximumRecords: 100,
		});
	});
});

// ============================================================
// getAvailablePeriods
// ============================================================

describe("getAvailablePeriods", () => {
	it("returns periods spanning multiple eras", () => {
		const periods = getAvailablePeriods();

		expect(periods.length).toBeGreaterThan(0);

		const eras = new Set(periods.map((p) => p.era));
		expect(eras.has("明治")).toBe(true);
		expect(eras.has("大正")).toBe(true);
		expect(eras.has("昭和")).toBe(true);
		expect(eras.has("平成")).toBe(true);
		expect(eras.has("令和")).toBe(true);
	});

	it("returns periods with valid YYYY-MM format", () => {
		const periods = getAvailablePeriods();

		for (const period of periods) {
			expect(period.value).toMatch(/^\d{4}-\d{2}$/);
			// Verify it's parseable
			expect(() => parsePeriod(period.value)).not.toThrow();
		}
	});

	it("returns periods with non-empty labels", () => {
		const periods = getAvailablePeriods();

		for (const period of periods) {
			expect(period.label.length).toBeGreaterThan(0);
		}
	});

	it("returns periods sorted chronologically", () => {
		const periods = getAvailablePeriods();

		for (let i = 1; i < periods.length; i++) {
			expect(periods[i].value >= periods[i - 1].value).toBe(true);
		}
	});

	it("includes the first Imperial Diet session", () => {
		const periods = getAvailablePeriods();
		const firstSession = periods.find((p) => p.value === "1890-11");
		expect(firstSession).toBeDefined();
		expect(firstSession?.era).toBe("明治");
	});

	it("includes a modern era period", () => {
		const periods = getAvailablePeriods();
		const modern = periods.find((p) => p.value === "2024-01");
		expect(modern).toBeDefined();
		expect(modern?.era).toBe("令和");
	});
});
