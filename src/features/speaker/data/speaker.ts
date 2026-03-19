import { ui } from "../../../i18n/ui";
import { searchSpeeches as searchKokkaiSpeeches } from "../../search/data/kokkai";
import { searchBooks } from "../../search/data/ndl-search";
import type {
	NdlBook,
	SpeechRecord,
	SpeechResponse,
} from "../../search/data/schemas";
import { searchSpeeches as searchTeikokuSpeeches } from "../../search/data/teikoku";

// ============================================================
// Types
// ============================================================

export interface SpeakerProfile {
	name: string;
	totalSpeeches: number;
	kokkaiSpeeches: number;
	teikokuSpeeches: number;
	speeches: SpeechRecord[];
	keywords: KeywordEntry[];
	warnings: string[];
}

export interface KeywordEntry {
	word: string;
	count: number;
}

// ============================================================
// Stop words — common Japanese particles, auxiliaries, and
// grammatical words that should be excluded from keyword
// extraction.
// ============================================================

const STOP_WORDS = new Set([
	// Particles
	"は",
	"が",
	"の",
	"を",
	"に",
	"で",
	"と",
	"も",
	"や",
	"か",
	"へ",
	"から",
	"まで",
	"より",
	"ば",
	"けど",
	"けれど",
	"けれども",
	"のに",
	"ので",
	"し",
	"って",
	"など",
	"とか",
	"だけ",
	"しか",
	"ほど",
	"くらい",
	"ぐらい",
	"ながら",
	"ため",
	"ところ",
	// Auxiliaries / copula
	"です",
	"ます",
	"ません",
	"でした",
	"ました",
	"ない",
	"ある",
	"いる",
	"する",
	"なる",
	"れる",
	"られる",
	"せる",
	"させる",
	"できる",
	"おる",
	// Common verbs / adverbs that carry little topical weight
	"これ",
	"それ",
	"あれ",
	"この",
	"その",
	"あの",
	"ここ",
	"そこ",
	"あそこ",
	"こと",
	"もの",
	"ため",
	"わけ",
	"よう",
	"ほう",
	"とき",
	"ところ",
	"つもり",
	"はず",
	// Formal parliamentary filler
	"について",
	"ついて",
	"おき",
	"おり",
	"ござい",
	"いたし",
	"申し上げ",
	"思い",
	"思う",
	"考え",
	"言う",
	"いう",
	"いた",
	"した",
	"なり",
	"なっ",
	"あり",
	"あっ",
	"でき",
	"でし",
	"まし",
	"ませ",
]);

// Regex to split Japanese text into word-like tokens.
// Splits on particles, punctuation, whitespace, and common delimiters.
const SPLIT_PATTERN =
	/[、。！？\s　「」『』（）()【】[\]・,.:;!?\-\n\r\t\u3000]+/;

const DEFAULT_MAX_KEYWORDS = 20;
const DEFAULT_MAX_RESULTS = 50;

// ============================================================
// Public API
// ============================================================

/**
 * Search for a speaker's speeches across both kokkai (post-war)
 * and teikoku (pre-war) APIs. Calls are made sequentially to
 * respect NDL API rate limits.
 */
export async function searchSpeaker(
	name: string,
	options?: { maxResults?: number },
): Promise<SpeakerProfile> {
	const maxResults = options?.maxResults ?? DEFAULT_MAX_RESULTS;
	const warnings: string[] = [];

	// Kokkai API first
	let kokkaiResponse: SpeechResponse;
	try {
		kokkaiResponse = await searchKokkaiSpeeches({
			speaker: name,
			maximumRecords: maxResults,
		});
	} catch (error) {
		warnings.push(
			ui.error.kokkaiSearchFailed(
				error instanceof Error ? error.message : ui.error.unknownDetail,
			),
		);
		kokkaiResponse = {
			numberOfRecords: 0,
			numberOfReturn: 0,
			startRecord: 1,
		};
	}

	// Teikoku API second (sequential — rate limit)
	let teikokuResponse: SpeechResponse;
	try {
		teikokuResponse = await searchTeikokuSpeeches({
			speaker: name,
			maximumRecords: maxResults,
		});
	} catch (error) {
		warnings.push(
			ui.error.teikokuSearchFailed(
				error instanceof Error ? error.message : ui.error.unknownDetail,
			),
		);
		teikokuResponse = {
			numberOfRecords: 0,
			numberOfReturn: 0,
			startRecord: 1,
		};
	}

	const kokkaiRecords = kokkaiResponse.speechRecord ?? [];
	const teikokuRecords = teikokuResponse.speechRecord ?? [];
	const allSpeeches = [...kokkaiRecords, ...teikokuRecords];

	const keywords = extractKeywords(allSpeeches);

	return {
		name,
		totalSpeeches:
			kokkaiResponse.numberOfRecords + teikokuResponse.numberOfRecords,
		kokkaiSpeeches: kokkaiResponse.numberOfRecords,
		teikokuSpeeches: teikokuResponse.numberOfRecords,
		speeches: allSpeeches,
		keywords,
		warnings,
	};
}

/**
 * Extract frequently used words from speech texts.
 *
 * Uses a simple approach: split text by common Japanese
 * particles and punctuation, count word frequencies, filter
 * out stop words and very short words, and return the top N
 * keywords sorted by frequency.
 */
export function extractKeywords(
	speeches: SpeechRecord[],
	maxKeywords: number = DEFAULT_MAX_KEYWORDS,
): KeywordEntry[] {
	if (speeches.length === 0) {
		return [];
	}

	const frequency = new Map<string, number>();

	for (const record of speeches) {
		const tokens = record.speech.split(SPLIT_PATTERN);
		for (const token of tokens) {
			const word = token.trim();
			// Filter: skip empty, single-character words, and stop words
			if (word.length <= 1) {
				continue;
			}
			if (STOP_WORDS.has(word)) {
				continue;
			}
			frequency.set(word, (frequency.get(word) ?? 0) + 1);
		}
	}

	const entries: KeywordEntry[] = [];
	for (const [word, count] of frequency) {
		entries.push({ word, count });
	}

	// Sort by frequency descending, then alphabetically for stable ordering
	entries.sort((a, b) => {
		if (b.count !== a.count) {
			return b.count - a.count;
		}
		return a.word.localeCompare(b.word);
	});

	return entries.slice(0, maxKeywords);
}

/**
 * Search NDL for books related to a speaker.
 * @throws {Error} On API failure — caller should handle and display warning.
 */
export async function getRelatedBooks(speakerName: string): Promise<NdlBook[]> {
	const response = await searchBooks(speakerName);
	return response.items;
}
