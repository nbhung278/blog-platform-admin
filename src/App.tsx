import { Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

export default function App() {
	return (
		<div className="min-h-screen bg-gray-50">
			<Outlet />
			<Toaster richColors closeButton position="top-right" />
		</div>
	);
}
