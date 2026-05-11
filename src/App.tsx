import { Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function App() {
	return (
		<div className="min-h-screen bg-gray-50">
			<ErrorBoundary>
				<Outlet />
				<Toaster richColors closeButton position="top-right" />
			</ErrorBoundary>
		</div>
	);
}
