import { ndlFetch } from "./ndl-fetch";
import {
	type SearchParams,
	type SpeechResponse,
	SpeechResponseSchema,
} from "./schemas";

/**
 * Build a URLSearchParams from search parameters, adding
 * the required recordPacking=json parameter.
 */
export function buildSpeechParams(params: SearchParams): URLSearchParams {
	const searchParams = new URLSearchParams();
	searchParams.set("recordPacking", "json");

	if (params.keyword) {
		searchParams.set("any", params.keyword);
	}
	if (params.from) {
		searchParams.set("from", params.from);
	}
	if (params.until) {
		searchParams.set("until", params.until);
	}
	if (params.speaker) {
		searchParams.set("speaker", params.speaker);
	}
	if (params.nameOfHouse) {
		searchParams.set("nameOfHouse", params.nameOfHouse);
	}
	if (params.maximumRecords !== undefined) {
		searchParams.set("maximumRecords", String(params.maximumRecords));
	}
	if (params.startRecord !== undefined) {
		searchParams.set("startRecord", String(params.startRecord));
	}

	return searchParams;
}

/**
 * Search speeches using the given base URL and API name.
 */
export async function fetchSpeeches(
	baseUrl: string,
	apiName: string,
	params: SearchParams,
): Promise<SpeechResponse> {
	const searchParams = buildSpeechParams(params);
	const url = `${baseUrl}/speech?${searchParams.toString()}`;

	const response = await ndlFetch(url);
	if (!response.ok) {
		throw new Error(
			`${apiName} speech request failed: ${response.status} ${response.statusText}`,
		);
	}

	let data: unknown;
	try {
		data = await response.json();
	} catch {
		throw new Error(
			`${apiName} returned invalid JSON (expected JSON response, got non-JSON content)`,
		);
	}
	return SpeechResponseSchema.parse(data);
}

/**
 * Get a single speech by its ID using the given base URL and API name.
 */
export async function fetchSpeechById(
	baseUrl: string,
	apiName: string,
	speechId: string,
): Promise<SpeechResponse> {
	const searchParams = new URLSearchParams();
	searchParams.set("recordPacking", "json");
	searchParams.set("speechID", speechId);
	const url = `${baseUrl}/speech?${searchParams.toString()}`;

	const response = await ndlFetch(url);
	if (!response.ok) {
		throw new Error(
			`${apiName} speech request failed: ${response.status} ${response.statusText}`,
		);
	}

	let data: unknown;
	try {
		data = await response.json();
	} catch {
		throw new Error(
			`${apiName} returned invalid JSON (expected JSON response, got non-JSON content)`,
		);
	}
	return SpeechResponseSchema.parse(data);
}
