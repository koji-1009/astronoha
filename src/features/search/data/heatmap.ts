/**
 * Heatmap data access — year-by-year speech counts stored in D1.
 *
 * Generation is incremental: each request generates a batch of years,
 * and the page auto-refreshes until all years are populated.
 * Past years are immutable (parliamentary records don't change).
 */

import { z } from "astro/zod";
import { ndlFetch } from "./ndl-fetch";
import { SpeechResponseSchema } from "./schemas";
import { buildSpeechParams } from "./speech-api";

const HeatmapRowSchema = z.object({
	year: z.number(),
	count: z.number(),
});

const ExistingPairSchema = z.object({
	target: z.string(),
	year: z.number(),
});

const KOKKAI_START_YEAR = 1947;
const TEIKOKU_START_YEAR = 1890;
const TEIKOKU_END_YEAR = 1947;
const BATCH_SIZE = 10;

export interface HeatmapEntry {
	year: number;
	count: number;
}

export interface HeatmapData {
	keyword: string;
	target: "kokkai" | "teikoku" | "both";
	entries: HeatmapEntry[];
	totalYears: number;
	populatedYears: number;
	complete: boolean;
}

function getExpectedYears(target: "kokkai" | "teikoku" | "both"): number[] {
	const currentYear = new Date().getFullYear();
	const years: number[] = [];
	if (target === "kokkai" || target === "both") {
		for (let y = KOKKAI_START_YEAR; y <= currentYear; y++) {
			years.push(y);
		}
	}
	if (target === "teikoku" || target === "both") {
		for (let y = TEIKOKU_START_YEAR; y < TEIKOKU_END_YEAR; y++) {
			if (!years.includes(y)) years.push(y);
		}
	}
	return years.sort((a, b) => a - b);
}

function getApiBaseUrl(
	year: number,
	apiConfig: { kokkai: string; teikoku: string },
): { url: string; apiName: string } | null {
	if (year >= KOKKAI_START_YEAR) {
		return { url: apiConfig.kokkai, apiName: "National Diet API" };
	}
	if (year >= TEIKOKU_START_YEAR && year < TEIKOKU_END_YEAR) {
		return { url: apiConfig.teikoku, apiName: "Imperial Diet API" };
	}
	return null;
}

async function fetchYearCount(
	keyword: string,
	year: number,
	apiConfig: { kokkai: string; teikoku: string },
): Promise<number> {
	const api = getApiBaseUrl(year, apiConfig);
	if (!api) return 0;

	const params = buildSpeechParams({
		keyword,
		from: `${year}-01-01`,
		until: `${year}-12-31`,
		maximumRecords: 1,
	});
	const url = `${api.url}/speech?${params.toString()}`;

	const response = await ndlFetch(url);
	if (!response.ok) return 0;

	const data: unknown = await response.json();
	const parsed = SpeechResponseSchema.safeParse(data);
	return parsed.success ? parsed.data.numberOfRecords : 0;
}

/**
 * Get heatmap data from D1. Returns whatever is available.
 */
export async function getHeatmapData(
	db: D1Database,
	keyword: string,
	target: "kokkai" | "teikoku" | "both",
): Promise<HeatmapData> {
	const expectedYears = getExpectedYears(target);
	const targets = target === "both" ? ["kokkai", "teikoku"] : [target];

	const placeholders = targets.map(() => "?").join(", ");
	const result = await db
		.prepare(
			`SELECT year, SUM(count) as count FROM heatmap
			 WHERE keyword = ? AND target IN (${placeholders})
			 GROUP BY year ORDER BY year`,
		)
		.bind(keyword, ...targets)
		.all();

	const entries: HeatmapEntry[] = [];
	for (const row of result.results) {
		const parsed = HeatmapRowSchema.safeParse(row);
		if (parsed.success) {
			entries.push(parsed.data);
		}
	}
	const populatedYears = new Set(entries.map((e) => e.year));

	return {
		keyword,
		target,
		entries,
		totalYears: expectedYears.length,
		populatedYears: populatedYears.size,
		complete: expectedYears.every((y) => populatedYears.has(y)),
	};
}

/**
 * Generate the next batch of missing years. Returns the number of years generated.
 */
export async function generateHeatmapBatch(
	db: D1Database,
	keyword: string,
	target: "kokkai" | "teikoku" | "both",
	apiConfig: { kokkai: string; teikoku: string },
): Promise<number> {
	const expectedYears = getExpectedYears(target);
	const targets = target === "both" ? ["kokkai", "teikoku"] : [target];

	// Find which (target, year) pairs are missing
	const existing = await db
		.prepare(
			`SELECT target, year FROM heatmap
			 WHERE keyword = ? AND target IN (${targets.map(() => "?").join(", ")})`,
		)
		.bind(keyword, ...targets)
		.all();

	const existingSet = new Set<string>();
	for (const row of existing.results) {
		const parsed = ExistingPairSchema.safeParse(row);
		if (parsed.success) {
			existingSet.add(`${parsed.data.target}:${parsed.data.year}`);
		}
	}

	const missing: Array<{ target: "kokkai" | "teikoku"; year: number }> = [];
	for (const year of expectedYears) {
		for (const t of targets) {
			const api = getApiBaseUrl(year, apiConfig);
			if (!api) continue;
			const apiTarget =
				year < TEIKOKU_END_YEAR &&
				year >= TEIKOKU_START_YEAR &&
				year < KOKKAI_START_YEAR
					? "teikoku"
					: "kokkai";
			if (t !== apiTarget) continue;
			if (!existingSet.has(`${t}:${year}`)) {
				missing.push({ target: t as "kokkai" | "teikoku", year });
			}
		}
	}

	if (missing.length === 0) return 0;

	// Generate a batch
	const batch = missing.slice(0, BATCH_SIZE);
	const statements: D1PreparedStatement[] = [];

	for (const { target: t, year } of batch) {
		const count = await fetchYearCount(keyword, year, apiConfig);
		statements.push(
			db
				.prepare(
					`INSERT OR REPLACE INTO heatmap (keyword, target, year, count)
					 VALUES (?, ?, ?, ?)`,
				)
				.bind(keyword, t, year, count),
		);
	}

	if (statements.length > 0) {
		try {
			await db.batch(statements);
		} catch (error) {
			throw new Error(
				`Heatmap D1 batch insert failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	return batch.length;
}
