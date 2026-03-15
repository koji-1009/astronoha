const THUMBNAIL_BASE_URL = "https://ndlsearch.ndl.go.jp/thumbnail";

/**
 * Construct the thumbnail URL for a given identifier.
 * The identifier can be an ISBN, JP number, or other NDL identifier.
 */
export function getThumbnailUrl(identifier: string): string {
	if (!identifier) {
		throw new Error("Identifier must not be empty");
	}
	return `${THUMBNAIL_BASE_URL}/${encodeURIComponent(identifier)}`;
}

/**
 * Get the base URL. Exposed for testing.
 */
export function _getBaseUrl(): string {
	return THUMBNAIL_BASE_URL;
}
