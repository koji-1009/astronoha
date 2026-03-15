import { ui } from "../../../i18n/ui";
import { searchSpeeches as searchKokkaiSpeeches } from "../../search/data/kokkai";
import { searchBooksByYear } from "../../search/data/ndl-search";
import type { NdlBook, SpeechRecord } from "../../search/data/schemas";
import { searchSpeeches as searchTeikokuSpeeches } from "../../search/data/teikoku";

// ============================================================
// Types
// ============================================================

export interface TimelineEntry {
	type: "speech" | "publication";
	date: string;
	title: string;
	// speech fields
	speechId?: string | undefined;
	speaker?: string | undefined;
	house?: string | undefined;
	// publication fields
	author?: string | undefined;
	publisher?: string | undefined;
	link?: string | undefined;
	identifier?: string | undefined;
}

export interface TimelineData {
	keyword: string;
	period: string;
	from: string;
	until: string;
	entries: TimelineEntry[];
	totalSpeeches: number;
	totalPublications: number;
	warnings: string[];
}

export interface Period {
	value: string;
	label: string;
	era: string;
}

// ============================================================
// parsePeriod
// ============================================================

/**
 * Parse a "YYYY-MM" period string into from/until date strings
 * and extracted year/month values.
 *
 * @throws {Error} If the period format is invalid.
 */
export function parsePeriod(period: string): {
	from: string;
	until: string;
	year: number;
	month: number;
} {
	const match = /^(\d{4})-(\d{2})$/.exec(period);
	if (!match?.[1] || !match[2]) {
		throw new Error(`Invalid period format: "${period}". Expected "YYYY-MM".`);
	}

	const year = Number.parseInt(match[1], 10);
	const month = Number.parseInt(match[2], 10);

	if (month < 1 || month > 12) {
		throw new Error(
			`Invalid month in period: "${period}". Month must be between 01 and 12.`,
		);
	}

	const from = `${period}-01`;

	// Calculate the last day of the month.
	// Using Date with (year, month, 0) gives the last day of the given month,
	// since months in Date are 0-indexed, so new Date(year, month, 0) is
	// the last day of (month - 1 + 1) = month.
	const lastDay = new Date(year, month, 0).getDate();
	const until = `${period}-${String(lastDay).padStart(2, "0")}`;

	return { from, until, year, month };
}

// ============================================================
// mergeTimelineEntries
// ============================================================

/**
 * Create TimelineEntry objects from speeches and books,
 * sorted by date ascending. Missing or partial dates are
 * placed at the end of the timeline.
 */
export function mergeTimelineEntries(
	speeches: SpeechRecord[],
	books: NdlBook[],
): TimelineEntry[] {
	const entries: TimelineEntry[] = [];

	for (const speech of speeches) {
		entries.push({
			type: "speech",
			date: speech.date ?? "",
			title: `${speech.nameOfMeeting} ${speech.issue}`,
			speechId: speech.speechID,
			speaker: speech.speaker ?? undefined,
			house: speech.nameOfHouse,
		});
	}

	for (const book of books) {
		entries.push({
			type: "publication",
			date: book.date ?? "",
			title: book.title,
			author: book.author ?? undefined,
			publisher: book.publisher ?? undefined,
			link: book.link,
			identifier: book.identifier ?? undefined,
		});
	}

	entries.sort((a, b) => {
		// Empty dates sort to the end
		if (!a.date && !b.date) return 0;
		if (!a.date) return 1;
		if (!b.date) return -1;
		return a.date.localeCompare(b.date);
	});

	return entries;
}

// ============================================================
// getTimelineData
// ============================================================

/**
 * Query parliamentary speeches and publications within a date range,
 * then merge them into a unified timeline.
 *
 * API calls are sequential (not Promise.all) to comply with NDL
 * rate limit requirements.
 */
export async function getTimelineData(
	keyword: string,
	period: string,
): Promise<TimelineData> {
	const { from, until, year } = parsePeriod(period);

	const allSpeeches: SpeechRecord[] = [];
	const warnings: string[] = [];
	let totalSpeeches = 0;

	// Search kokkai speeches (sequential)
	try {
		const kokkaiResult = await searchKokkaiSpeeches({
			keyword,
			from,
			until,
			maximumRecords: 100,
		});
		totalSpeeches += kokkaiResult.numberOfRecords;
		if (kokkaiResult.speechRecord) {
			allSpeeches.push(...kokkaiResult.speechRecord);
		}
	} catch (error) {
		warnings.push(
			ui.error.kokkaiRetrieveFailed(
				error instanceof Error ? error.message : ui.error.unknownDetail,
			),
		);
	}

	// Search teikoku speeches (sequential)
	try {
		const teikokuResult = await searchTeikokuSpeeches({
			keyword,
			from,
			until,
			maximumRecords: 100,
		});
		totalSpeeches += teikokuResult.numberOfRecords;
		if (teikokuResult.speechRecord) {
			allSpeeches.push(...teikokuResult.speechRecord);
		}
	} catch (error) {
		warnings.push(
			ui.error.teikokuRetrieveFailed(
				error instanceof Error ? error.message : ui.error.unknownDetail,
			),
		);
	}

	// Search NDL books published in that year (sequential)
	let allBooks: NdlBook[] = [];
	let totalPublications = 0;
	try {
		const booksResult = await searchBooksByYear(keyword, year, year, {
			count: 100,
		});
		totalPublications = booksResult.totalResults;
		allBooks = booksResult.items;
	} catch (error) {
		warnings.push(
			ui.error.publicationRetrieveFailed(
				error instanceof Error ? error.message : ui.error.unknownDetail,
			),
		);
	}

	const entries = mergeTimelineEntries(allSpeeches, allBooks);

	return {
		keyword,
		period,
		from,
		until,
		entries,
		totalSpeeches,
		totalPublications,
		warnings,
	};
}

// ============================================================
// getAvailablePeriods
// ============================================================

/**
 * Return a static list of notable periods for the timeline index page.
 * Covers the Imperial Diet era through the modern era.
 */
export function getAvailablePeriods(): Period[] {
	return [
		{
			value: "1890-11",
			label: "第1回帝国議会開会",
			era: "明治",
		},
		{
			value: "1894-10",
			label: "日清戦争中の臨時議会",
			era: "明治",
		},
		{
			value: "1904-03",
			label: "日露戦争期の議会",
			era: "明治",
		},
		{
			value: "1918-09",
			label: "原敬内閣の成立",
			era: "大正",
		},
		{
			value: "1925-03",
			label: "普通選挙法審議",
			era: "大正",
		},
		{
			value: "1931-09",
			label: "満州事変後の議会",
			era: "昭和",
		},
		{
			value: "1938-03",
			label: "国家総動員法審議",
			era: "昭和",
		},
		{
			value: "1947-05",
			label: "日本国憲法施行・第1回国会",
			era: "昭和",
		},
		{
			value: "1951-09",
			label: "サンフランシスコ講和条約審議",
			era: "昭和",
		},
		{
			value: "1960-05",
			label: "安保条約改定審議",
			era: "昭和",
		},
		{
			value: "1972-09",
			label: "日中国交正常化",
			era: "昭和",
		},
		{
			value: "1989-01",
			label: "昭和から平成へ",
			era: "平成",
		},
		{
			value: "2001-10",
			label: "テロ対策特別措置法審議",
			era: "平成",
		},
		{
			value: "2011-03",
			label: "東日本大震災への対応",
			era: "平成",
		},
		{
			value: "2019-05",
			label: "令和の始まり",
			era: "令和",
		},
		{
			value: "2024-01",
			label: "第213回国会",
			era: "令和",
		},
	];
}
