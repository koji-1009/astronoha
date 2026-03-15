import type { z } from "astro/zod";
import {
	NdlBookSchema,
	NdlSearchResponseSchema,
	SearchParamsSchema,
	SpeechRecordSchema,
	SpeechResponseSchema,
} from "../../../../src/features/search/data/schemas";

describe("SpeechRecordSchema", () => {
	const validRecord = {
		speechID: "121004005X01020240131001",
		issueID: "121004005X01020240131",
		nameOfHouse: "衆議院",
		nameOfMeeting: "本会議",
		issue: "第10号",
		date: "2024-01-31",
		speech: "この法案について申し上げます。",
		speaker: "山田太郎",
		speechURL: "https://kokkai.ndl.go.jp/txt/121004005X01020240131/001",
		meetingURL: "https://kokkai.ndl.go.jp/txt/121004005X01020240131",
	};

	it("parses a valid speech record", () => {
		const result = SpeechRecordSchema.parse(validRecord);
		expect(result.speechID).toBe("121004005X01020240131001");
		expect(result.speaker).toBe("山田太郎");
		expect(result.nameOfHouse).toBe("衆議院");
	});

	it("parses a record with optional fields", () => {
		const recordWithOptional = {
			...validRecord,
			speechOrder: 1,
			speakerYomi: "やまだたろう",
			speakerGroup: "自由民主党",
			speakerPosition: "議員",
			speakerRole: "発言者",
			session: 213,
		};
		const result = SpeechRecordSchema.parse(recordWithOptional);
		expect(result.speechOrder).toBe(1);
		expect(result.speakerYomi).toBe("やまだたろう");
		expect(result.session).toBe(213);
	});

	it("allows optional fields to be missing", () => {
		const result = SpeechRecordSchema.parse(validRecord);
		expect(result.speechOrder).toBeUndefined();
		expect(result.speakerYomi).toBeUndefined();
		expect(result.speakerGroup).toBeUndefined();
	});

	it("rejects a record missing required fields", () => {
		const incomplete = {
			speechID: "123",
			nameOfHouse: "衆議院",
		};
		expect(() => SpeechRecordSchema.parse(incomplete)).toThrow();
	});

	it("rejects a record with wrong types", () => {
		const wrongTypes = {
			...validRecord,
			speechID: 123, // should be string
		};
		expect(() => SpeechRecordSchema.parse(wrongTypes)).toThrow();
	});
});

describe("SpeechResponseSchema", () => {
	it("parses a valid speech response", () => {
		const validResponse = {
			numberOfRecords: 42,
			numberOfReturn: 2,
			startRecord: 1,
			nextRecordPosition: 3,
			speechRecord: [
				{
					speechID: "test001",
					issueID: "testissue",
					nameOfHouse: "衆議院",
					nameOfMeeting: "本会議",
					issue: "第1号",
					date: "2024-01-01",
					speech: "テスト発言",
					speaker: "テスト太郎",
					speechURL: "https://example.com/speech",
					meetingURL: "https://example.com/meeting",
				},
			],
		};
		const result = SpeechResponseSchema.parse(validResponse);
		expect(result.numberOfRecords).toBe(42);
		expect(result.speechRecord).toHaveLength(1);
	});

	it("parses a response with no speech records (zero results)", () => {
		const emptyResponse = {
			numberOfRecords: 0,
			numberOfReturn: 0,
			startRecord: 1,
		};
		const result = SpeechResponseSchema.parse(emptyResponse);
		expect(result.numberOfRecords).toBe(0);
		expect(result.speechRecord).toBeUndefined();
	});

	it("parses a response where nextRecordPosition is absent", () => {
		const response = {
			numberOfRecords: 5,
			numberOfReturn: 5,
			startRecord: 1,
			speechRecord: [],
		};
		const result = SpeechResponseSchema.parse(response);
		expect(result.nextRecordPosition).toBeUndefined();
	});

	it("rejects a response missing numberOfRecords", () => {
		const invalid = {
			numberOfReturn: 0,
			startRecord: 1,
		};
		expect(() => SpeechResponseSchema.parse(invalid)).toThrow();
	});
});

describe("NdlBookSchema", () => {
	it("parses a book with all fields", () => {
		const book = {
			title: "日本国憲法の誕生",
			link: "https://ndlsearch.ndl.go.jp/books/R100000002-I000008732451",
			author: "佐藤達夫 著",
			publisher: "中央公論新社",
			description: "日本国憲法の制定過程を詳述した名著の復刊版。",
			date: "2020",
			identifier: "978-4-12-206864-3",
			isbn: "978-4-12-206864-3",
			jpNumber: "JP20010001",
		};
		const result = NdlBookSchema.parse(book);
		expect(result.title).toBe("日本国憲法の誕生");
		expect(result.isbn).toBe("978-4-12-206864-3");
	});

	it("parses a book with only required fields", () => {
		const book = {
			title: "テスト書籍",
			link: "https://example.com",
		};
		const result = NdlBookSchema.parse(book);
		expect(result.title).toBe("テスト書籍");
		expect(result.author).toBeUndefined();
		expect(result.isbn).toBeUndefined();
	});

	it("rejects a book without title", () => {
		const invalid = {
			link: "https://example.com",
		};
		expect(() => NdlBookSchema.parse(invalid)).toThrow();
	});
});

describe("NdlSearchResponseSchema", () => {
	it("parses a valid search response", () => {
		const response = {
			totalResults: 100,
			startIndex: 1,
			itemsPerPage: 10,
			items: [
				{
					title: "テスト",
					link: "https://example.com",
				},
			],
		};
		const result = NdlSearchResponseSchema.parse(response);
		expect(result.totalResults).toBe(100);
		expect(result.items).toHaveLength(1);
	});

	it("parses with empty items array", () => {
		const response = {
			totalResults: 0,
			startIndex: 1,
			itemsPerPage: 0,
			items: [],
		};
		const result = NdlSearchResponseSchema.parse(response);
		expect(result.items).toHaveLength(0);
	});
});

describe("SearchParamsSchema", () => {
	it("parses with all fields", () => {
		const params = {
			keyword: "憲法",
			from: "2020-01-01",
			until: "2024-12-31",
			speaker: "山田太郎",
			nameOfHouse: "衆議院",
			maximumRecords: 10,
			startRecord: 1,
		};
		const result = SearchParamsSchema.parse(params);
		expect(result.keyword).toBe("憲法");
		expect(result.maximumRecords).toBe(10);
	});

	it("parses with no fields (all optional)", () => {
		const result = SearchParamsSchema.parse({});
		expect(result.keyword).toBeUndefined();
		expect(result.speaker).toBeUndefined();
	});
});

describe("type inference", () => {
	it("infers correct types from schemas", () => {
		// These are compile-time checks, but we verify runtime behavior
		type SpeechRecord = z.infer<typeof SpeechRecordSchema>;
		const record: SpeechRecord = {
			speechID: "test",
			issueID: "test",
			nameOfHouse: "衆議院",
			nameOfMeeting: "本会議",
			issue: "第1号",
			date: "2024-01-01",
			speech: "テスト",
			speaker: "テスト",
			speechURL: "https://example.com",
			meetingURL: "https://example.com",
		};
		expect(record.speechID).toBe("test");
	});
});
