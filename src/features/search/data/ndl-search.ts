import { XMLParser } from "fast-xml-parser";
import { apiConfig } from "./api-config";
import { ndlFetch } from "./ndl-fetch";
import {
	type NdlBook,
	NdlBookSchema,
	type NdlSearchResponse,
	NdlSearchResponseSchema,
} from "./schemas";

function getOpenSearchUrl(): string {
	return apiConfig.opensearch;
}

function getSruUrl(): string {
	return apiConfig.sru;
}

export interface SearchBooksOptions {
	count?: number;
	startIndex?: number;
}

const parser = new XMLParser({
	ignoreAttributes: false,
	trimValues: true,
	processEntities: true,
	parseTagValue: false,
	isArray: (name) =>
		name === "item" || name === "record" || name === "dc:identifier",
});

function classifyIdentifiers(identifiers: string[]): {
	identifier?: string | undefined;
	isbn?: string | undefined;
	jpNumber?: string | undefined;
} {
	let identifier: string | undefined;
	let isbn: string | undefined;
	let jpNumber: string | undefined;

	for (const id of identifiers) {
		const idStr = String(id);
		if (/^(978|979)?\d{9}[\dXx]$/.test(idStr.replace(/-/g, ""))) {
			isbn = idStr;
			if (!identifier) identifier = idStr;
		} else if (/^JP\d+/.test(idStr)) {
			jpNumber = idStr;
			if (!identifier) identifier = idStr;
		} else if (!identifier) {
			identifier = idStr;
		}
	}
	return { identifier, isbn, jpNumber };
}

/**
 * Safely extract a string value from a parsed XML node.
 * fast-xml-parser may return a string, number, or object depending on content.
 */
function toStr(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	// If the parser returns an object (e.g. a tag with attributes), extract #text
	if (typeof value === "object" && value !== null && "#text" in value) {
		return String((value as Record<string, unknown>)["#text"]);
	}
	return undefined;
}

/**
 * Extract all dc:identifier values from a parsed item as strings.
 */
function extractIdentifiers(item: Record<string, unknown>): string[] {
	const ids = item["dc:identifier"];
	if (!ids) return [];
	if (Array.isArray(ids)) {
		return ids
			.map((id) => {
				if (typeof id === "string") return id;
				if (typeof id === "number") return String(id);
				if (typeof id === "object" && id !== null && "#text" in id) {
					return String((id as Record<string, unknown>)["#text"]);
				}
				return "";
			})
			.filter((s) => s.length > 0);
	}
	const single = toStr(ids);
	return single ? [single] : [];
}

/**
 * Parse an RSS XML item object into an NdlBook.
 */
function parseItem(item: Record<string, unknown>): NdlBook {
	const title = toStr(item.title) ?? "";
	const link = toStr(item.link) ?? "";
	const author = toStr(item.author) ?? toStr(item["dc:creator"]);
	const publisher = toStr(item["dc:publisher"]);
	const description = toStr(item.description);
	const date = toStr(item["dc:date"]);

	const ids = classifyIdentifiers(extractIdentifiers(item));

	const raw = {
		title,
		link,
		author,
		publisher,
		description,
		date,
		...ids,
	};

	return NdlBookSchema.parse(raw);
}

/**
 * Parse the RSS XML response from NDL Search OpenSearch API.
 */
export function parseOpenSearchResponse(xml: string): NdlSearchResponse {
	const parsed = parser.parse(xml);
	const channel = parsed?.rss?.channel ?? parsed?.channel ?? {};

	const totalResults = Number.parseInt(
		String(channel["openSearch:totalResults"] ?? "0"),
		10,
	);
	const startIndex = Number.parseInt(
		String(channel["openSearch:startIndex"] ?? "1"),
		10,
	);
	const itemsPerPage = Number.parseInt(
		String(channel["openSearch:itemsPerPage"] ?? "0"),
		10,
	);

	const itemsRaw: Record<string, unknown>[] = Array.isArray(channel.item)
		? channel.item
		: channel.item
			? [channel.item]
			: [];

	const items = itemsRaw.map(parseItem);

	const raw = {
		totalResults,
		startIndex,
		itemsPerPage,
		items,
	};

	return NdlSearchResponseSchema.parse(raw);
}

/**
 * Search books via NDL Search OpenSearch API.
 */
export async function searchBooks(
	keyword: string,
	options?: SearchBooksOptions,
): Promise<NdlSearchResponse> {
	const params = new URLSearchParams();
	params.set("any", keyword);

	if (options?.count !== undefined) {
		params.set("cnt", String(options.count));
	}
	if (options?.startIndex !== undefined) {
		params.set("idx", String(options.startIndex));
	}

	const url = `${getOpenSearchUrl()}?${params.toString()}`;

	const response = await ndlFetch(url);
	if (!response.ok) {
		throw new Error(
			`NDL Search API request failed: ${response.status} ${response.statusText}`,
		);
	}

	const xml = await response.text();
	return parseOpenSearchResponse(xml);
}

/**
 * Search books by year range using the NDL Search SRU API.
 * Uses CQL query syntax with publication year filters.
 */
export async function searchBooksByYear(
	keyword: string,
	fromYear: number,
	toYear: number,
	options?: SearchBooksOptions,
): Promise<NdlSearchResponse> {
	// Build CQL query with publication year range
	const cqlQuery = `anywhere="${keyword}" AND from="${fromYear}" AND until="${toYear}"`;

	const params = new URLSearchParams();
	params.set("operation", "searchRetrieve");
	params.set("query", cqlQuery);

	if (options?.count !== undefined) {
		params.set("maximumRecords", String(options.count));
	}
	if (options?.startIndex !== undefined) {
		params.set("startRecord", String(options.startIndex));
	}

	const url = `${getSruUrl()}?${params.toString()}`;

	const response = await ndlFetch(url);
	if (!response.ok) {
		throw new Error(
			`NDL Search SRU API request failed: ${response.status} ${response.statusText}`,
		);
	}

	const xml = await response.text();
	return parseSruResponse(xml);
}

/**
 * Parse the SRU XML response from NDL Search.
 * SRU uses a different XML structure than OpenSearch.
 */
export function parseSruResponse(xml: string): NdlSearchResponse {
	const parsed = parser.parse(xml);
	const root = parsed?.searchRetrieveResponse ?? parsed ?? {};

	const numberOfRecords = Number.parseInt(
		String(root.numberOfRecords ?? "0"),
		10,
	);

	const nextRecordPosition =
		root.nextRecordPosition !== undefined
			? Number.parseInt(String(root.nextRecordPosition), 10)
			: undefined;

	// Extract records from SRU response
	// recordData content is HTML-escaped XML — decode entities before parsing
	const records: Record<string, unknown>[] = Array.isArray(root.records?.record)
		? root.records.record
		: root.records?.record
			? [root.records.record]
			: [];

	const items: NdlBook[] = records.map((record: Record<string, unknown>) => {
		const recordData = String(
			(record as Record<string, unknown>).recordData ?? "",
		);
		// recordData is entity-decoded XML string — parse it again
		const innerParsed = parser.parse(recordData);
		const dc =
			innerParsed?.["srw_dc:dc"] ?? innerParsed?.dc ?? innerParsed ?? {};

		const title = toStr(dc["dc:title"]) ?? "";
		const link = toStr(dc["dc:identifier"]) ?? "";
		const author = toStr(dc["dc:creator"]);
		const publisher = toStr(dc["dc:publisher"]);
		const description = toStr(dc["dc:description"]);
		const date = toStr(dc["dc:date"]);

		const identifiers = extractIdentifiers(dc);
		const ids = classifyIdentifiers(identifiers);

		return NdlBookSchema.parse({
			title,
			link,
			author,
			publisher,
			description,
			date,
			...ids,
		});
	});

	// SRU startRecord defaults to 1
	const startIndex = nextRecordPosition ? nextRecordPosition - items.length : 1;

	return NdlSearchResponseSchema.parse({
		totalResults: numberOfRecords,
		startIndex,
		itemsPerPage: items.length,
		items,
	});
}
