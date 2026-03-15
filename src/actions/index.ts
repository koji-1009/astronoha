import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { encodeSettings } from "../features/settings/data/cookie";

const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: true,
	sameSite: "lax" as const,
	maxAge: 60 * 60 * 24 * 365,
	path: "/",
};

export const server = {
	updateSettingsForm: defineAction({
		accept: "form",
		input: z.object({
			autoSummary: z.coerce.boolean(),
			colorMode: z.enum(["system", "light", "dark"]),
		}),
		handler: async (input, context) => {
			const encoded = encodeSettings(input);
			context.cookies.set("astronoha_settings", encoded, COOKIE_OPTIONS);
			return { success: true };
		},
	}),
};
