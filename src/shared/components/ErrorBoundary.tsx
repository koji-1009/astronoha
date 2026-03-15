import { Component, type ErrorInfo, type ReactNode } from "react";
import { ui } from "../../i18n/ui";

interface ErrorBoundaryProps {
	fallback?: ReactNode;
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): ErrorBoundaryState {
		return { hasError: true };
	}

	override componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error("Island error:", error, info);
	}

	override render(): ReactNode {
		if (this.state.hasError) {
			return (
				this.props.fallback ?? (
					<div
						style={{
							padding: "var(--md-sys-spacing-4)",
							color: "var(--md-sys-color-on-surface-variant)",
							fontSize: "var(--md-sys-typescale-body-small-size)",
						}}
					>
						{ui.error.islandLoadFailed}
					</div>
				)
			);
		}
		return this.props.children;
	}
}
