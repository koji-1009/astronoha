import { apiConfig } from "./api-config";
import type { SearchParams, SpeechResponse } from "./schemas";
import {
	buildSpeechParams,
	fetchSpeechById,
	fetchSpeeches,
} from "./speech-api";

/**
 * Search speeches in the Imperial Diet (pre-war parliament) API.
 */
export function searchSpeeches(params: SearchParams): Promise<SpeechResponse> {
	return fetchSpeeches(apiConfig.teikoku, "Imperial Diet API", params);
}

/**
 * Get a single speech by its ID from the Imperial Diet API.
 */
export function getSpeechById(speechId: string): Promise<SpeechResponse> {
	return fetchSpeechById(apiConfig.teikoku, "Imperial Diet API", speechId);
}

export function _getBaseUrl(): string {
	return apiConfig.teikoku;
}

export { buildSpeechParams as _buildParams };
