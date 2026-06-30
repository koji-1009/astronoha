/**
 * Shared formatting utilities.
 */

/**
 * Format an NDL API date string (YYYY-MM-DD, YYYY-MM, or YYYY) to Japanese.
 */
export function formatDate(dateStr: string | null): string {
	if (!dateStr) return "";
	const parts = dateStr.split("-");
	const [year, month, day] = parts;
	if (parts.length === 3 && month !== undefined && day !== undefined) {
		return `${year}年${Number.parseInt(month, 10)}月${Number.parseInt(day, 10)}日`;
	}
	if (parts.length === 2 && month !== undefined) {
		return `${year}年${Number.parseInt(month, 10)}月`;
	}
	return `${year}年`;
}

/**
 * Truncate text for display in card listings.
 */
export function truncateSpeech(text: string, maxLength = 200): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}...`;
}
