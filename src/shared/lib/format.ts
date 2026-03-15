/**
 * Shared formatting utilities.
 */

/**
 * Format an NDL API date string (YYYY-MM-DD, YYYY-MM, or YYYY) to Japanese.
 */
export function formatDate(dateStr: string | null): string {
	if (!dateStr) return "";
	const parts = dateStr.split("-");
	if (parts.length === 3) {
		return `${parts[0]}年${Number.parseInt(parts[1], 10)}月${Number.parseInt(parts[2], 10)}日`;
	}
	if (parts.length === 2) {
		return `${parts[0]}年${Number.parseInt(parts[1], 10)}月`;
	}
	return `${parts[0]}年`;
}

/**
 * Truncate text for display in card listings.
 */
export function truncateSpeech(text: string, maxLength = 200): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}...`;
}
