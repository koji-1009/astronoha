import { apiConfig } from "./api-config";
import type { SearchParams, SpeechResponse } from "./schemas";
import {
	buildSpeechParams,
	fetchSpeechById,
	fetchSpeeches,
} from "./speech-api";

/**
 * Search speeches in the National Diet (post-war parliament) API.
 */
export function searchSpeeches(params: SearchParams): Promise<SpeechResponse> {
	return fetchSpeeches(apiConfig.kokkai, "National Diet API", params);
}

/**
 * Get a single speech by its ID from the National Diet API.
 */
export function getSpeechById(speechId: string): Promise<SpeechResponse> {
	return fetchSpeechById(apiConfig.kokkai, "National Diet API", speechId);
}

export function _getBaseUrl(): string {
	return apiConfig.kokkai;
}

export { buildSpeechParams as _buildParams };
