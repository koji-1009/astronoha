/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { Settings } from "./shared/types/settings";

declare global {
	namespace App {
		interface Locals {
			settings: Settings;
		}
	}
}
