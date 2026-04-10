import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ui } from "@/i18n/ui";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import {
	type AIStatus,
	checkAvailability,
	createSession,
} from "../lib/chrome-ai";
import { renderMarkdown } from "../lib/markdown";

type LlmAction = "summary" | "keywords" | "context" | "trend";

interface LlmPanelProps {
	/** Actions to display. Each action requires corresponding data props. */
	actions: LlmAction[];
	speechText?: string;
	keyword?: string;
	year?: number;
}

type PanelStatus = AIStatus | "checking" | "error";

interface LlmState {
	status: PanelStatus;
	loading: boolean;
	result: string;
	error: string;
	activeAction: string;
}

interface AISession {
	prompt(input: string): Promise<string>;
	destroy(): void;
}

const SYSTEM_PROMPTS = {
	summary: ui.llm.promptSummarize,
	keywords: (keyword: string) => ui.llm.promptSuggestKeywords(keyword),
	context: (year: number) => ui.llm.promptHistoricalContext(String(year)),
	trend: (keyword: string) => ui.llm.promptAnalyzeTrend(keyword),
};

const ACTION_LABELS: Record<LlmAction, { default: string; loading: string }> = {
	summary: { default: ui.llm.summarize, loading: ui.llm.summarizing },
	keywords: { default: ui.llm.suggestKeywords, loading: ui.llm.suggesting },
	context: { default: ui.llm.historicalContext, loading: ui.llm.generating },
	trend: { default: ui.llm.analyzeTrend, loading: ui.llm.analyzing },
};

interface ActionArgs {
	systemPrompt: string;
	userPrompt: string;
}

/**
 * Build system and user prompts for an action.
 * Returns null when the required data prop is absent (guard).
 */
function buildActionArgs(
	action: LlmAction,
	props: { speechText?: string; keyword?: string; year?: number },
): ActionArgs | null {
	const { speechText, keyword, year } = props;
	switch (action) {
		case "summary":
			return speechText
				? { systemPrompt: SYSTEM_PROMPTS.summary, userPrompt: speechText }
				: null;
		case "keywords":
			return keyword
				? {
						systemPrompt: SYSTEM_PROMPTS.keywords(keyword),
						userPrompt: `「${keyword}」に関連する検索キーワードを提案してください`,
					}
				: null;
		case "context":
			return year !== undefined
				? {
						systemPrompt: SYSTEM_PROMPTS.context(year),
						userPrompt: `${year}年の時代背景を教えてください`,
					}
				: null;
		case "trend":
			return keyword
				? {
						systemPrompt: SYSTEM_PROMPTS.trend(keyword),
						userPrompt: `「${keyword}」の議会での使用頻度の傾向を分析してください`,
					}
				: null;
	}
}

const MAX_RETRIES = 60;
const RETRY_INTERVAL_MS = 3000;

const resultStyle: React.CSSProperties = {
	marginTop: "var(--md-sys-spacing-3)",
	padding: "var(--md-sys-spacing-3)",
	backgroundColor: "var(--md-sys-color-surface-container)",
	borderRadius: "var(--md-sys-shape-corner-small)",
	fontSize: "var(--md-sys-typescale-body-medium-size)",
	lineHeight: "var(--md-sys-typescale-body-medium-line-height)",
	color: "var(--md-sys-color-on-surface)",
};

function ResultContent({ markdown }: { markdown: string }) {
	const html = useMemo(() => renderMarkdown(markdown), [markdown]);
	return (
		<>
			<div
				style={resultStyle}
				className="llm-result"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: source is local Chrome AI, not user input
				dangerouslySetInnerHTML={{ __html: html }}
			/>
			<p
				style={{
					fontSize: "var(--md-sys-typescale-label-small-size)",
					lineHeight: "var(--md-sys-typescale-label-small-line-height)",
					color: "var(--md-sys-color-on-surface-variant)",
					marginTop: "var(--md-sys-spacing-2)",
				}}
			>
				{ui.llm.disclaimer}
			</p>
		</>
	);
}

/** Build a sessionStorage key scoped to this page + query params and action. */
function storageKey(action: string): string {
	return `llm_${action}_${window.location.pathname}${window.location.search}`;
}

function saveResult(action: string, result: string): void {
	try {
		sessionStorage.setItem(storageKey(action), result);
	} catch {
		// sessionStorage full or unavailable — ignore
	}
}

function loadResult(action: string): string {
	try {
		return sessionStorage.getItem(storageKey(action)) ?? "";
	} catch {
		return "";
	}
}

function LlmPanelInner({
	actions: enabledActions,
	speechText,
	keyword,
	year,
}: LlmPanelProps) {
	const [state, setState] = useState<LlmState>({
		status: "checking",
		loading: false,
		result: "",
		error: "",
		activeAction: "",
	});

	const sessionRef = useRef<AISession | null>(null);

	useEffect(() => {
		let cancelled = false;
		let retries = 0;

		async function tryCreateSession(): Promise<boolean> {
			try {
				const sess = await createSession("");
				if (!cancelled) {
					sess.destroy();
					setState((prev) => ({ ...prev, status: "available" }));
				}
				return true;
			} catch {
				return false;
			}
		}

		async function check() {
			const s = await checkAvailability();
			if (cancelled) return;

			if (s === "available") {
				const ok = await tryCreateSession();
				if (!ok && !cancelled) {
					setState((prev) => ({ ...prev, status: "error" }));
				}
			} else if (s === "downloadable" || s === "downloading") {
				const ok = await tryCreateSession();
				if (ok || cancelled) return;

				setState((prev) => ({ ...prev, status: s }));
				retries++;
				if (retries >= MAX_RETRIES) {
					if (!cancelled) {
						setState((prev) => ({
							...prev,
							status: "error",
							error: ui.llm.downloadTimeout,
						}));
					}
				} else {
					setTimeout(check, RETRY_INTERVAL_MS);
				}
			} else {
				setState((prev) => ({ ...prev, status: s }));
			}
		}

		check();

		return () => {
			cancelled = true;
			if (sessionRef.current) {
				sessionRef.current.destroy();
				sessionRef.current = null;
			}
		};
	}, []);

	const getSession = useCallback(
		async (systemPrompt: string): Promise<AISession> => {
			if (sessionRef.current) {
				sessionRef.current.destroy();
				sessionRef.current = null;
			}
			const session = await createSession(systemPrompt);
			sessionRef.current = session;
			return session;
		},
		[],
	);

	const runAction = useCallback(
		async (actionName: string, systemPrompt: string, userPrompt: string) => {
			setState((prev) => ({
				...prev,
				loading: true,
				error: "",
				result: "",
				activeAction: actionName,
			}));
			try {
				const session = await getSession(systemPrompt);
				const result = await session.prompt(userPrompt);
				saveResult(actionName, result);
				setState((prev) => ({
					...prev,
					loading: false,
					result,
					activeAction: actionName,
				}));
			} catch (err) {
				setState((prev) => ({
					...prev,
					loading: false,
					error: err instanceof Error ? err.message : ui.llm.generateError,
				}));
			}
		},
		[getSession],
	);

	// Restore previous result from sessionStorage on mount
	const hasCache = useRef(false);
	useEffect(() => {
		for (const action of ["summary", "keywords", "context", "trend"]) {
			const saved = loadResult(action);
			if (saved) {
				hasCache.current = true;
				setState((prev) => ({
					...prev,
					result: saved,
					activeAction: action,
				}));
				break;
			}
		}
	}, []);

	// Auto-run first action when autoSummary is enabled, AI becomes available,
	// and no cached result exists. Refs guard against re-runs so the effect
	// only fires once despite the broad dependency array.
	const autoRanRef = useRef(false);
	useEffect(() => {
		if (
			state.status !== "available" ||
			state.loading ||
			hasCache.current ||
			autoRanRef.current
		) {
			return;
		}
		let autoSummary = false;
		try {
			autoSummary = localStorage.getItem("astronoha_autoSummary") === "true";
		} catch {
			// localStorage unavailable
		}
		if (!autoSummary) return;
		autoRanRef.current = true;
		const first = enabledActions[0];
		if (!first) return;
		const args = buildActionArgs(first, { speechText, keyword, year });
		if (args) runAction(first, args.systemPrompt, args.userPrompt);
	}, [
		state.status,
		state.loading,
		enabledActions,
		speechText,
		keyword,
		year,
		runAction,
	]);

	function handleAction(action: LlmAction) {
		const args = buildActionArgs(action, { speechText, keyword, year });
		if (!args) return;
		runAction(action, args.systemPrompt, args.userPrompt);
	}

	if (enabledActions.length === 0) {
		return null;
	}

	return (
		<div
			style={{
				backgroundColor: "var(--md-sys-color-surface-container-low)",
				borderRadius: "var(--md-sys-shape-corner-medium)",
				padding: "var(--md-sys-spacing-4)",
				boxShadow: "var(--md-sys-elevation-1)",
			}}
		>
			<h3
				style={{
					fontSize: "var(--md-sys-typescale-title-small-size)",
					fontWeight: "var(--md-sys-typescale-title-small-weight)",
					lineHeight: "var(--md-sys-typescale-title-small-line-height)",
					color: "var(--md-sys-color-on-surface)",
					marginBottom: "var(--md-sys-spacing-3)",
					display: "flex",
					alignItems: "center",
					gap: "var(--md-sys-spacing-2)",
				}}
			>
				<span aria-hidden="true">AI</span>
				{ui.llm.title}
			</h3>

			{state.status === "checking" && !state.result && (
				<p
					style={{
						color: "var(--md-sys-color-on-surface-variant)",
						fontSize: "var(--md-sys-typescale-body-small-size)",
					}}
				>
					{ui.llm.checking}
				</p>
			)}

			{(state.status === "unavailable" || state.status === "no-api") &&
				!state.result && (
					<div
						style={{
							color: "var(--md-sys-color-on-surface-variant)",
							fontSize: "var(--md-sys-typescale-body-small-size)",
							lineHeight: "var(--md-sys-typescale-body-small-line-height)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--md-sys-spacing-2)",
						}}
					>
						<p>{ui.llm.unavailable}</p>
						<details>
							<summary
								style={{
									cursor: "pointer",
									color: "var(--md-sys-color-primary)",
								}}
							>
								{ui.llm.howToEnable}
							</summary>
							<ol
								style={{
									marginTop: "var(--md-sys-spacing-2)",
									paddingLeft: "var(--md-sys-spacing-5)",
									display: "flex",
									flexDirection: "column",
									gap: "var(--md-sys-spacing-1)",
								}}
							>
								<li>
									{ui.llm.enableStep1Prefix}{" "}
									<code
										style={{
											backgroundColor: "var(--md-sys-color-surface-container)",
											padding: "0 var(--md-sys-spacing-1)",
											borderRadius: "var(--md-sys-shape-corner-extra-small)",
										}}
									>
										{ui.llm.enableStep1Flag}
									</code>{" "}
									{ui.llm.enableStep1Action}
								</li>
								<li>{ui.llm.enableStep2}</li>
								<li>{ui.llm.enableStep3}</li>
							</ol>
						</details>
					</div>
				)}

			{state.status === "downloading" && (
				<p
					style={{
						color: "var(--md-sys-color-on-surface-variant)",
						fontSize: "var(--md-sys-typescale-body-small-size)",
					}}
				>
					{ui.llm.downloading}
				</p>
			)}

			{state.status === "downloadable" && (
				<p
					style={{
						color: "var(--md-sys-color-on-surface-variant)",
						fontSize: "var(--md-sys-typescale-body-small-size)",
					}}
				>
					{ui.llm.downloadStarting}
				</p>
			)}

			{state.status === "error" && !state.error && (
				<p
					style={{
						color: "var(--md-sys-color-error)",
						fontSize: "var(--md-sys-typescale-body-small-size)",
					}}
				>
					{ui.llm.initFailed}
				</p>
			)}

			{state.status === "available" && (
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--md-sys-spacing-2)",
					}}
				>
					{enabledActions.map((action) => {
						const args = buildActionArgs(action, {
							speechText,
							keyword,
							year,
						});
						if (!args) return null;
						const labels = ACTION_LABELS[action];
						return (
							<button
								key={action}
								type="button"
								className="outlined"
								disabled={state.loading}
								onClick={() => handleAction(action)}
							>
								{state.loading && state.activeAction === action
									? labels.loading
									: labels.default}
							</button>
						);
					})}
				</div>
			)}

			{state.error && (
				<p
					style={{
						color: "var(--md-sys-color-error)",
						fontSize: "var(--md-sys-typescale-body-small-size)",
						lineHeight: "var(--md-sys-typescale-body-small-line-height)",
						marginTop: "var(--md-sys-spacing-3)",
					}}
				>
					{state.error}
				</p>
			)}

			{state.result && <ResultContent markdown={state.result} />}
		</div>
	);
}

export default function LlmPanel(props: LlmPanelProps) {
	return (
		<ErrorBoundary>
			<LlmPanelInner {...props} />
		</ErrorBoundary>
	);
}
