import {
	DEFAULT_SETTINGS,
	type Settings,
	settingsSchema,
} from "../../../shared/types/settings";

export const COOKIE_NAME = "astronoha_settings";

/**
 * Serialize settings to a cookie-safe base64 string.
 */
export function encodeSettings(settings: Settings): string {
	const json = JSON.stringify(settings);
	return btoa(json);
}

/**
 * Deserialize settings from a cookie value.
 * Never throws. Returns DEFAULT_SETTINGS on any error.
 */
export function decodeSettings(value: string): Settings {
	try {
		const json = atob(value);
		const parsed: unknown = JSON.parse(json);
		const result = settingsSchema.safeParse(parsed);
		if (result.success) {
			return result.data;
		}
		return DEFAULT_SETTINGS;
	} catch {
		return DEFAULT_SETTINGS;
	}
}
