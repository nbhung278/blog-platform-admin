import { Outlet } from "@tanstack/react-router";

export default function App() {
	return (
		<div className="min-h-screen bg-gray-50">
			<Outlet />
		</div>
	);
}
