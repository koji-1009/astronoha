import { z } from "astro/zod";

export interface Settings {
	autoSummary: boolean;
	colorMode: "system" | "light" | "dark";
}

export const DEFAULT_SETTINGS: Settings = {
	autoSummary: false,
	colorMode: "system",
};

export const settingsSchema = z.object({
	autoSummary: z.boolean(),
	colorMode: z.enum(["system", "light", "dark"]),
});
