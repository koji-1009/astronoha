// Chrome built-in AI (Prompt API)
// Reference: https://developer.chrome.com/docs/ai/prompt-api

interface LanguageModelSession {
	prompt(input: string): Promise<string>;
	destroy(): void;
}

interface ExpectedOutput {
	type: "text";
	languages: string[];
}

interface LanguageModelCreateOptions {
	systemPrompt: string;
	expectedOutputs?: ExpectedOutput[];
}

interface LanguageModelAPI {
	availability?: (options?: {
		expectedOutputs?: ExpectedOutput[];
	}) => Promise<string>;
	capabilities?: () => Promise<{ available: string }>;
	create(options: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

declare global {
	const LanguageModel: LanguageModelAPI | undefined;

	interface Window {
		ai?: {
			languageModel?: LanguageModelAPI;
		};
	}
}

function getAPI(): LanguageModelAPI | null {
	if (typeof LanguageModel !== "undefined") return LanguageModel;
	if (typeof window !== "undefined" && window.ai?.languageModel)
		return window.ai.languageModel;
	return null;
}

export type AIStatus =
	| "available"
	| "downloadable"
	| "downloading"
	| "unavailable"
	| "no-api";

const OUTPUT_OPTIONS: ExpectedOutput[] = [{ type: "text", languages: ["ja"] }];

export async function checkAvailability(): Promise<AIStatus> {
	try {
		const api = getAPI();
		if (!api) return "no-api";

		let status: string;
		if (typeof api.availability === "function") {
			status = await api.availability({ expectedOutputs: OUTPUT_OPTIONS });
		} else if (typeof api.capabilities === "function") {
			const caps = await api.capabilities();
			status = caps?.available ?? "no";
		} else {
			return "unavailable";
		}

		if (status === "readily" || status === "available") return "available";
		if (status === "after-download" || status === "downloadable")
			return "downloadable";
		if (status === "downloading") return "downloading";
		return "unavailable";
	} catch {
		return "unavailable";
	}
}

export async function createSession(
	systemPrompt: string,
): Promise<LanguageModelSession> {
	const api = getAPI();
	if (!api) {
		throw new Error("Chrome AI not available");
	}
	return api.create({ systemPrompt, expectedOutputs: OUTPUT_OPTIONS });
}
