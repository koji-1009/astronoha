import { z } from "astro/zod";

// ============================================================
// Speech Record (shared between kokkai and teikoku APIs)
// ============================================================

export const SpeechRecordSchema = z
	.object({
		speechID: z.string(),
		issueID: z.string(),
		nameOfHouse: z.string(),
		nameOfMeeting: z.string(),
		issue: z.string(),
		date: z.string().nullable(),
		speech: z.string(),
		speaker: z.string().nullable(),
		speechURL: z.string(),
		meetingURL: z.string(),
		// Optional fields that may appear in responses
		// Use .nullish() because real NDL API returns explicit null for absent values
		speechOrder: z.number().nullish(),
		speakerYomi: z.string().nullish(),
		speakerGroup: z.string().nullish(),
		speakerPosition: z.string().nullish(),
		speakerRole: z.string().nullish(),
		imageKind: z.string().nullish(),
		startPage: z.number().nullish(),
		session: z.number().nullish(),
		closing: z.string().nullish(),
		pdfURL: z.string().nullish(),
	})
	// passthrough: skip unknown-key stripping to avoid creating a new object per record.
	// NDL API responses include extra fields (searchObject, speakerElection, officeTerm, etc.)
	// that we don't use but don't need to strip — saves CPU on large result sets.
	.passthrough();

export type SpeechRecord = z.infer<typeof SpeechRecordSchema>;

// ============================================================
// Speech Search Response
// ============================================================

export const SpeechResponseSchema = z.object({
	numberOfRecords: z.number(),
	numberOfReturn: z.number(),
	startRecord: z.number(),
	nextRecordPosition: z.number().nullish(),
	speechRecord: z.array(SpeechRecordSchema).nullish(),
});

export type SpeechResponse = z.infer<typeof SpeechResponseSchema>;

// ============================================================
// NDL Search Book Result (parsed from XML)
// ============================================================

export const NdlBookSchema = z.object({
	title: z.string(),
	link: z.string(),
	author: z.string().optional(),
	publisher: z.string().optional(),
	description: z.string().optional(),
	date: z.string().optional(),
	identifier: z.string().optional(),
	isbn: z.string().optional(),
	jpNumber: z.string().optional(),
});

export type NdlBook = z.infer<typeof NdlBookSchema>;

// ============================================================
// NDL Search Response (parsed from XML)
// ============================================================

export const NdlSearchResponseSchema = z.object({
	totalResults: z.number(),
	startIndex: z.number(),
	itemsPerPage: z.number(),
	items: z.array(NdlBookSchema),
});

export type NdlSearchResponse = z.infer<typeof NdlSearchResponseSchema>;

// ============================================================
// Search Parameters (shared between kokkai and teikoku)
// ============================================================

export const SearchParamsSchema = z.object({
	keyword: z.string().optional(),
	from: z.string().optional(),
	until: z.string().optional(),
	speaker: z.string().optional(),
	nameOfHouse: z.string().optional(),
	maximumRecords: z.number().optional(),
	startRecord: z.number().optional(),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;
