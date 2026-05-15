import { Link } from "@tanstack/react-router";

export default function NotFoundPage() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
			<p className="text-sm font-medium text-gray-400">404</p>
			<h1 className="text-2xl font-semibold text-gray-900">Page not found</h1>
			<p className="max-w-md text-sm text-gray-500">
				The page you're looking for doesn't exist or has been moved.
			</p>
			<Link
				to="/"
				className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
			>
				Back to dashboard
			</Link>
		</div>
	);
}
