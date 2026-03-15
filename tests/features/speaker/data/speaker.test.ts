import type {
	NdlSearchResponse,
	SpeechRecord,
	SpeechResponse,
} from "../../../../src/features/search/data/schemas";
import {
	extractKeywords,
	getRelatedBooks,
	searchSpeaker,
} from "../../../../src/features/speaker/data/speaker";

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
	searchBooks: vi.fn(),
}));

// Import mocked modules so we can control their return values
import { searchSpeeches as mockKokkaiSearch } from "../../../../src/features/search/data/kokkai";
import { searchBooks as mockSearchBooks } from "../../../../src/features/search/data/ndl-search";
import { searchSpeeches as mockTeikokuSearch } from "../../../../src/features/search/data/teikoku";

// Cast to vi.Mock for type safety
const kokkaiSearch = mockKokkaiSearch as ReturnType<typeof vi.fn>;
const teikokuSearch = mockTeikokuSearch as ReturnType<typeof vi.fn>;
const ndlSearchBooks = mockSearchBooks as ReturnType<typeof vi.fn>;

// ============================================================
// Helpers — reusable fixture builders
// ============================================================

function makeSpeechRecord(overrides: Partial<SpeechRecord> = {}): SpeechRecord {
	return {
		speechID: "test-speech-001",
		issueID: "test-issue-001",
		nameOfHouse: "衆議院",
		nameOfMeeting: "本会議",
		issue: "第1号",
		date: "2024-01-15",
		speech: "テスト発言です。",
		speaker: "田中一郎",
		speechURL: "https://kokkai.ndl.go.jp/txt/test/001",
		meetingURL: "https://kokkai.ndl.go.jp/txt/test",
		...overrides,
	};
}

function makeSpeechResponse(
	records: SpeechRecord[],
	total?: number,
): SpeechResponse {
	return {
		numberOfRecords: total ?? records.length,
		numberOfReturn: records.length,
		startRecord: 1,
		speechRecord: records.length > 0 ? records : undefined,
	};
}

function makeEmptyResponse(): SpeechResponse {
	return {
		numberOfRecords: 0,
		numberOfReturn: 0,
		startRecord: 1,
	};
}

// ============================================================
// Tests
// ============================================================

beforeEach(() => {
	kokkaiSearch.mockReset();
	teikokuSearch.mockReset();
	ndlSearchBooks.mockReset();
});

describe("searchSpeaker", () => {
	it("calls both kokkai and teikoku APIs with the correct speaker name", async () => {
		kokkaiSearch.mockResolvedValueOnce(makeEmptyResponse());
		teikokuSearch.mockResolvedValueOnce(makeEmptyResponse());

		await searchSpeaker("田中一郎");

		expect(kokkaiSearch).toHaveBeenCalledOnce();
		expect(kokkaiSearch).toHaveBeenCalledWith({
			speaker: "田中一郎",
			maximumRecords: 50,
		});

		expect(teikokuSearch).toHaveBeenCalledOnce();
		expect(teikokuSearch).toHaveBeenCalledWith({
			speaker: "田中一郎",
			maximumRecords: 50,
		});
	});

	it("passes custom maxResults to both APIs", async () => {
		kokkaiSearch.mockResolvedValueOnce(makeEmptyResponse());
		teikokuSearch.mockResolvedValueOnce(makeEmptyResponse());

		await searchSpeaker("田中一郎", { maxResults: 10 });

		expect(kokkaiSearch).toHaveBeenCalledWith({
			speaker: "田中一郎",
			maximumRecords: 10,
		});
		expect(teikokuSearch).toHaveBeenCalledWith({
			speaker: "田中一郎",
			maximumRecords: 10,
		});
	});

	it("aggregates results from both APIs", async () => {
		const kokkaiRecord = makeSpeechRecord({
			speechID: "kokkai-001",
			speech: "国会での発言です。",
		});
		const teikokuRecord = makeSpeechRecord({
			speechID: "teikoku-001",
			speech: "帝国議会での発言であります。",
		});

		kokkaiSearch.mockResolvedValueOnce(makeSpeechResponse([kokkaiRecord], 5));
		teikokuSearch.mockResolvedValueOnce(makeSpeechResponse([teikokuRecord], 3));

		const profile = await searchSpeaker("田中一郎");

		expect(profile.name).toBe("田中一郎");
		expect(profile.totalSpeeches).toBe(8);
		expect(profile.kokkaiSpeeches).toBe(5);
		expect(profile.teikokuSpeeches).toBe(3);
		expect(profile.speeches).toHaveLength(2);
		expect(profile.speeches[0].speechID).toBe("kokkai-001");
		expect(profile.speeches[1].speechID).toBe("teikoku-001");
	});

	it("handles case where one API returns zero results", async () => {
		const kokkaiRecord = makeSpeechRecord({
			speechID: "kokkai-only",
			speech: "国会のみの発言。",
		});

		kokkaiSearch.mockResolvedValueOnce(makeSpeechResponse([kokkaiRecord], 1));
		teikokuSearch.mockResolvedValueOnce(makeEmptyResponse());

		const profile = await searchSpeaker("田中一郎");

		expect(profile.totalSpeeches).toBe(1);
		expect(profile.kokkaiSpeeches).toBe(1);
		expect(profile.teikokuSpeeches).toBe(0);
		expect(profile.speeches).toHaveLength(1);
		expect(profile.speeches[0].speechID).toBe("kokkai-only");
	});

	it("handles case where both APIs return zero results", async () => {
		kokkaiSearch.mockResolvedValueOnce(makeEmptyResponse());
		teikokuSearch.mockResolvedValueOnce(makeEmptyResponse());

		const profile = await searchSpeaker("存在しない議員");

		expect(profile.totalSpeeches).toBe(0);
		expect(profile.kokkaiSpeeches).toBe(0);
		expect(profile.teikokuSpeeches).toBe(0);
		expect(profile.speeches).toHaveLength(0);
		expect(profile.keywords).toHaveLength(0);
	});

	it("handles kokkai API error gracefully", async () => {
		kokkaiSearch.mockRejectedValueOnce(
			new Error(
				"National Diet API speech request failed: 500 Internal Server Error",
			),
		);
		const teikokuRecord = makeSpeechRecord({
			speechID: "teikoku-001",
			speech: "帝国議会の発言。",
		});
		teikokuSearch.mockResolvedValueOnce(makeSpeechResponse([teikokuRecord], 1));

		const profile = await searchSpeaker("田中一郎");

		expect(profile.kokkaiSpeeches).toBe(0);
		expect(profile.teikokuSpeeches).toBe(1);
		expect(profile.speeches).toHaveLength(1);
	});

	it("handles teikoku API error gracefully", async () => {
		const kokkaiRecord = makeSpeechRecord({
			speechID: "kokkai-001",
			speech: "国会の発言。",
		});
		kokkaiSearch.mockResolvedValueOnce(makeSpeechResponse([kokkaiRecord], 1));
		teikokuSearch.mockRejectedValueOnce(
			new Error(
				"Imperial Diet API speech request failed: 503 Service Unavailable",
			),
		);

		const profile = await searchSpeaker("田中一郎");

		expect(profile.kokkaiSpeeches).toBe(1);
		expect(profile.teikokuSpeeches).toBe(0);
		expect(profile.speeches).toHaveLength(1);
	});

	it("handles both APIs failing gracefully", async () => {
		kokkaiSearch.mockRejectedValueOnce(new Error("Network error"));
		teikokuSearch.mockRejectedValueOnce(new Error("Network error"));

		const profile = await searchSpeaker("田中一郎");

		expect(profile.totalSpeeches).toBe(0);
		expect(profile.kokkaiSpeeches).toBe(0);
		expect(profile.teikokuSpeeches).toBe(0);
		expect(profile.speeches).toHaveLength(0);
	});

	it("generates keywords from aggregated speeches", async () => {
		const kokkaiRecord = makeSpeechRecord({
			speechID: "kokkai-001",
			speech:
				"経済対策について、経済成長を促進する政策が必要です。経済の安定が重要であります。",
		});
		const teikokuRecord = makeSpeechRecord({
			speechID: "teikoku-001",
			speech:
				"経済の発展は国家の基盤であります。予算案について審議いたします。",
		});

		kokkaiSearch.mockResolvedValueOnce(makeSpeechResponse([kokkaiRecord], 1));
		teikokuSearch.mockResolvedValueOnce(makeSpeechResponse([teikokuRecord], 1));

		const profile = await searchSpeaker("田中一郎");

		expect(profile.keywords.length).toBeGreaterThan(0);
		// "経済" should appear frequently (split by particles)
		// The exact keywords depend on the splitting logic
		for (const kw of profile.keywords) {
			expect(kw.word.length).toBeGreaterThan(1);
			expect(kw.count).toBeGreaterThan(0);
		}
	});
});

describe("extractKeywords", () => {
	it("extracts top keywords from speech texts", () => {
		const speeches: SpeechRecord[] = [
			makeSpeechRecord({
				speech:
					"経済対策を推進する。経済成長が重要である。経済政策の見直しが必要だ。",
			}),
			makeSpeechRecord({
				speech: "予算案について審議する。予算の適正化を図る。",
			}),
		];

		const keywords = extractKeywords(speeches);

		expect(keywords.length).toBeGreaterThan(0);
		// All returned words should be longer than 1 character
		for (const kw of keywords) {
			expect(kw.word.length).toBeGreaterThan(1);
		}
		// Results should be sorted by count descending
		for (let i = 1; i < keywords.length; i++) {
			expect(keywords[i - 1].count).toBeGreaterThanOrEqual(keywords[i].count);
		}
	});

	it("filters out Japanese stop words", () => {
		const speeches: SpeechRecord[] = [
			makeSpeechRecord({
				speech: "これは経済の問題です。それは政策の課題です。あれは法案です。",
			}),
		];

		const keywords = extractKeywords(speeches);
		const words = keywords.map((k) => k.word);

		// Stop words should not appear
		expect(words).not.toContain("これ");
		expect(words).not.toContain("それ");
		expect(words).not.toContain("あれ");
		expect(words).not.toContain("です");
	});

	it("filters out single-character words", () => {
		const speeches: SpeechRecord[] = [
			makeSpeechRecord({
				speech: "あ い う え お 経済対策 経済対策",
			}),
		];

		const keywords = extractKeywords(speeches);

		for (const kw of keywords) {
			expect(kw.word.length).toBeGreaterThan(1);
		}
	});

	it("returns empty array for empty input", () => {
		const keywords = extractKeywords([]);
		expect(keywords).toEqual([]);
	});

	it("returns empty array for speeches with empty text", () => {
		const speeches: SpeechRecord[] = [makeSpeechRecord({ speech: "" })];

		const keywords = extractKeywords(speeches);
		expect(keywords).toEqual([]);
	});

	it("handles text with only stop words", () => {
		const speeches: SpeechRecord[] = [
			makeSpeechRecord({
				speech: "は が の を に で と も や か",
			}),
		];

		const keywords = extractKeywords(speeches);
		expect(keywords).toEqual([]);
	});

	it("handles text with only punctuation", () => {
		const speeches: SpeechRecord[] = [
			makeSpeechRecord({
				speech: "、。！？　「」『』（）",
			}),
		];

		const keywords = extractKeywords(speeches);
		expect(keywords).toEqual([]);
	});

	it("respects maxKeywords parameter", () => {
		const speeches: SpeechRecord[] = [
			makeSpeechRecord({
				speech:
					"経済 政策 予算 法案 審議 委員会 国会 議員 答弁 質問 " +
					"経済 政策 予算 法案 審議 委員会 国会 議員 答弁 質問",
			}),
		];

		const keywords = extractKeywords(speeches, 3);
		expect(keywords.length).toBeLessThanOrEqual(3);
	});

	it("counts word frequency correctly across multiple speeches", () => {
		const speeches: SpeechRecord[] = [
			makeSpeechRecord({
				speech: "経済対策、経済対策、経済対策",
			}),
			makeSpeechRecord({
				speech: "経済対策、予算案",
			}),
		];

		const keywords = extractKeywords(speeches);
		const keizaiTaisaku = keywords.find((k) => k.word === "経済対策");

		expect(keizaiTaisaku).toBeDefined();
		expect(keizaiTaisaku?.count).toBe(4);
	});

	it("sorts by frequency descending then alphabetically", () => {
		const speeches: SpeechRecord[] = [
			makeSpeechRecord({
				speech: "予算案、経済対策、予算案、経済対策、法案審議",
			}),
		];

		const keywords = extractKeywords(speeches);

		// Both "予算案" and "経済対策" appear twice, "法案審議" once
		// Words with same frequency should be in alphabetical order
		const topTwo = keywords.filter((k) => k.count === 2);
		if (topTwo.length === 2) {
			expect(topTwo[0].word.localeCompare(topTwo[1].word)).toBeLessThan(0);
		}
	});
});

describe("getRelatedBooks", () => {
	it("calls ndl-search with speaker name", async () => {
		const mockResponse: NdlSearchResponse = {
			totalResults: 1,
			startIndex: 1,
			itemsPerPage: 1,
			items: [
				{
					title: "田中一郎著作集",
					link: "https://ndlsearch.ndl.go.jp/books/test",
					author: "田中一郎",
					publisher: "出版社",
				},
			],
		};
		ndlSearchBooks.mockResolvedValueOnce(mockResponse);

		const books = await getRelatedBooks("田中一郎");

		expect(ndlSearchBooks).toHaveBeenCalledOnce();
		expect(ndlSearchBooks).toHaveBeenCalledWith("田中一郎");
		expect(books).toHaveLength(1);
		expect(books[0].title).toBe("田中一郎著作集");
		expect(books[0].author).toBe("田中一郎");
	});

	it("returns multiple books", async () => {
		const mockResponse: NdlSearchResponse = {
			totalResults: 2,
			startIndex: 1,
			itemsPerPage: 2,
			items: [
				{
					title: "政治と経済",
					link: "https://ndlsearch.ndl.go.jp/books/1",
				},
				{
					title: "国会論集",
					link: "https://ndlsearch.ndl.go.jp/books/2",
				},
			],
		};
		ndlSearchBooks.mockResolvedValueOnce(mockResponse);

		const books = await getRelatedBooks("田中一郎");
		expect(books).toHaveLength(2);
	});

	it("returns empty array on API error", async () => {
		ndlSearchBooks.mockRejectedValueOnce(
			new Error("NDL Search API request failed: 500 Internal Server Error"),
		);

		const books = await getRelatedBooks("田中一郎");
		expect(books).toEqual([]);
	});

	it("returns empty array when API returns no items", async () => {
		const mockResponse: NdlSearchResponse = {
			totalResults: 0,
			startIndex: 1,
			itemsPerPage: 0,
			items: [],
		};
		ndlSearchBooks.mockResolvedValueOnce(mockResponse);

		const books = await getRelatedBooks("存在しない著者");
		expect(books).toEqual([]);
	});
});
