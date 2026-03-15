import {
	decodeSettings,
	encodeSettings,
} from "../../../../src/features/settings/data/cookie";
import {
	DEFAULT_SETTINGS,
	type Settings,
	settingsSchema,
} from "../../../../src/shared/types/settings";

describe("encodeSettings / decodeSettings", () => {
	it("roundtrip preserves all values", () => {
		const settings: Settings = {
			autoSummary: true,
			colorMode: "dark",
		};
		const encoded = encodeSettings(settings);
		const decoded = decodeSettings(encoded);
		expect(decoded).toEqual(settings);
	});

	it("roundtrip preserves default settings", () => {
		const encoded = encodeSettings(DEFAULT_SETTINGS);
		const decoded = decodeSettings(encoded);
		expect(decoded).toEqual(DEFAULT_SETTINGS);
	});

	it("decodeSettings with invalid base64 returns DEFAULT_SETTINGS", () => {
		const result = decodeSettings("!!!not-valid-base64!!!");
		expect(result).toEqual(DEFAULT_SETTINGS);
	});

	it("decodeSettings with empty string returns DEFAULT_SETTINGS", () => {
		const result = decodeSettings("");
		expect(result).toEqual(DEFAULT_SETTINGS);
	});

	it("decodeSettings with valid base64 but invalid JSON returns DEFAULT_SETTINGS", () => {
		const encoded = btoa("not json at all");
		const result = decodeSettings(encoded);
		expect(result).toEqual(DEFAULT_SETTINGS);
	});

	it("decodeSettings with partial data returns DEFAULT_SETTINGS", () => {
		const partial = btoa(JSON.stringify({ autoSummary: true }));
		const result = decodeSettings(partial);
		expect(result).toEqual(DEFAULT_SETTINGS);
	});

	it("decodeSettings with wrong enum values returns DEFAULT_SETTINGS", () => {
		const invalid = btoa(
			JSON.stringify({
				autoSummary: false,
				colorMode: "invalid",
			}),
		);
		const result = decodeSettings(invalid);
		expect(result).toEqual(DEFAULT_SETTINGS);
	});

	it("different settings values encode to different strings", () => {
		const settingsA: Settings = {
			autoSummary: false,
			colorMode: "light",
		};
		const settingsB: Settings = {
			autoSummary: true,
			colorMode: "dark",
		};
		const encodedA = encodeSettings(settingsA);
		const encodedB = encodeSettings(settingsB);
		expect(encodedA).not.toEqual(encodedB);
	});
});

describe("settingsSchema", () => {
	it("validates correct settings", () => {
		const input = {
			autoSummary: false,
			colorMode: "system",
		};
		const result = settingsSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(input);
		}
	});

	it("validates all enum combinations for colorMode", () => {
		for (const mode of ["system", "light", "dark"] as const) {
			const result = settingsSchema.safeParse({
				autoSummary: false,
				colorMode: mode,
			});
			expect(result.success).toBe(true);
		}
	});

	it("rejects invalid colorMode enum value", () => {
		const result = settingsSchema.safeParse({
			autoSummary: false,
			colorMode: "auto",
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing fields", () => {
		const result = settingsSchema.safeParse({
			autoSummary: true,
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty object", () => {
		const result = settingsSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it("rejects non-boolean autoSummary", () => {
		const result = settingsSchema.safeParse({
			autoSummary: "yes",
			colorMode: "system",
		});
		expect(result.success).toBe(false);
	});
});
