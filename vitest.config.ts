import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		exclude: ["e2e/**", "node_modules/**"],
		server: {
			deps: {
				// @material/material-color-utilities@0.4.0 has a missing .js
				// extension in an internal ESM import. Inlining it forces Vite
				// to bundle-resolve the module instead of Node's strict ESM loader.
				inline: ["@material/material-color-utilities"],
			},
		},
	},
});
