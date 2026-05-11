import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[ErrorBoundary]", error, info.componentStack);
	}

	render() {
		if (this.state.error) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
					<p className="text-sm text-gray-500">Something went wrong. Please refresh the page.</p>
					<button
						onClick={() => this.setState({ error: null })}
						className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
					>
						Try again
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}
