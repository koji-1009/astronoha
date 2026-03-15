import { useState } from "react";
import { ui } from "@/i18n/ui";
import { ErrorBoundary } from "../../../shared/components/ErrorBoundary";

interface SettingsFormProps {
	currentSettings: {
		autoSummary: boolean;
		colorMode: "system" | "light" | "dark";
	};
}

interface FormState {
	autoSummary: boolean;
	colorMode: "system" | "light" | "dark";
	saving: boolean;
	error: string;
}

const COLOR_MODE_OPTIONS: Array<{
	value: "system" | "light" | "dark";
	label: string;
}> = [
	{ value: "system", label: ui.settings.colorModeSystemShort },
	{ value: "light", label: ui.settings.colorModeLightShort },
	{ value: "dark", label: ui.settings.colorModeDarkShort },
];

function SettingsFormInner({ currentSettings }: SettingsFormProps) {
	const [form, setForm] = useState<FormState>({
		...currentSettings,
		saving: false,
		error: "",
	});

	const hasChanges =
		form.autoSummary !== currentSettings.autoSummary ||
		form.colorMode !== currentSettings.colorMode;

	async function handleSave() {
		setForm((prev) => ({ ...prev, saving: true, error: "" }));

		try {
			const { actions } = await import("astro:actions");
			const result = await actions.updateSettings({
				autoSummary: form.autoSummary,
				colorMode: form.colorMode,
			});

			if (result.error) {
				setForm((prev) => ({
					...prev,
					saving: false,
					error: ui.settings.saveFailed,
				}));
				return;
			}

			const { navigate } = await import("astro:transitions/client");
			navigate(window.location.pathname);
		} catch {
			setForm((prev) => ({
				...prev,
				saving: false,
				error: ui.settings.saveFailed,
			}));
		}
	}

	const fieldsetStyle: React.CSSProperties = {
		border: "none",
		padding: 0,
		margin: 0,
		marginBottom: "var(--md-sys-spacing-6)",
	};

	const legendStyle: React.CSSProperties = {
		fontSize: "var(--md-sys-typescale-title-small-size)",
		fontWeight: "var(--md-sys-typescale-title-small-weight)",
		lineHeight: "var(--md-sys-typescale-title-small-line-height)",
		color: "var(--md-sys-color-on-surface)",
		marginBottom: "var(--md-sys-spacing-3)",
		display: "block",
	};

	const radioLabelStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: "var(--md-sys-spacing-2)",
		padding: "var(--md-sys-spacing-2) 0",
		fontSize: "var(--md-sys-typescale-body-large-size)",
		lineHeight: "var(--md-sys-typescale-body-large-line-height)",
		color: "var(--md-sys-color-on-surface)",
		cursor: "pointer",
	};

	return (
		<div
			style={{
				maxWidth: "600px",
			}}
		>
			{/* Auto Summary */}
			<fieldset style={fieldsetStyle}>
				<legend style={legendStyle}>{ui.settings.autoSummary}</legend>
				<label
					style={{
						...radioLabelStyle,
						cursor: "pointer",
					}}
				>
					<input
						type="checkbox"
						checked={form.autoSummary}
						onChange={(e) =>
							setForm((prev) => ({
								...prev,
								autoSummary: e.target.checked,
							}))
						}
						style={{
							accentColor: "var(--md-sys-color-primary)",
							width: "20px",
							height: "20px",
						}}
					/>
					{ui.settings.autoSummaryDetail}
				</label>
				<p
					style={{
						fontSize: "var(--md-sys-typescale-body-small-size)",
						lineHeight: "var(--md-sys-typescale-body-small-line-height)",
						color: "var(--md-sys-color-on-surface-variant)",
						paddingLeft: "var(--md-sys-spacing-8)",
					}}
				>
					{ui.settings.chromeAiRequired}
				</p>
			</fieldset>

			{/* Color Mode */}
			<fieldset style={fieldsetStyle}>
				<legend style={legendStyle}>{ui.settings.colorMode}</legend>
				{COLOR_MODE_OPTIONS.map((option) => (
					<label key={option.value} style={radioLabelStyle}>
						<input
							type="radio"
							name="colorMode"
							value={option.value}
							checked={form.colorMode === option.value}
							onChange={() =>
								setForm((prev) => ({
									...prev,
									colorMode: option.value,
								}))
							}
							style={{
								accentColor: "var(--md-sys-color-primary)",
								width: "20px",
								height: "20px",
							}}
						/>
						{option.label}
					</label>
				))}
			</fieldset>

			{/* Error */}
			{form.error && (
				<p
					style={{
						color: "var(--md-sys-color-error)",
						fontSize: "var(--md-sys-typescale-body-small-size)",
						lineHeight: "var(--md-sys-typescale-body-small-line-height)",
						marginBottom: "var(--md-sys-spacing-4)",
					}}
				>
					{form.error}
				</p>
			)}

			{/* Save Button */}
			<button
				type="button"
				className="filled"
				disabled={!hasChanges || form.saving}
				onClick={handleSave}
			>
				{form.saving ? ui.settings.saving : ui.settings.saveButton}
			</button>
		</div>
	);
}

export default function SettingsForm(props: SettingsFormProps) {
	return (
		<ErrorBoundary>
			<SettingsFormInner {...props} />
		</ErrorBoundary>
	);
}
