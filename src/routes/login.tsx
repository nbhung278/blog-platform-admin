import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/store/auth";
import { ADMIN_PANEL_PERMISSIONS } from "@/lib/permissions";
import { api } from "@/lib/api";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
	const navigate = useNavigate();
	const login = useAuth((s) => s.login);
	const loading = useAuth((s) => s.loading);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const { data } = await api.get<{ needsSetup: boolean }>("/api/auth/setup-status");
				if (data.needsSetup) navigate({ to: "/setup" });
			} catch {
				// ignore — backend offline, leave user on login
			}
		})();
	}, [navigate]);

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			await login(email, password);
			const user = useAuth.getState().user;
			if (user?.mustChangePassword) {
				navigate({ to: "/change-password" });
				return;
			}
			const allowed = user?.permissions.some((p) => ADMIN_PANEL_PERMISSIONS.includes(p));
			if (!allowed) {
				useAuth.getState().logout();
				setError("Your account does not have admin access.");
				return;
			}
			navigate({ to: "/" });
		} catch (err) {
			const msg =
				(err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
				"Login failed";
			setError(msg);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
				<h1 className="text-2xl font-bold">Admin Login</h1>
				<p className="mt-1 text-sm text-gray-500">Sign in to manage the platform.</p>

				<div className="mt-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">Email</label>
						<input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">Password</label>
						<PasswordInput
							required
							autoComplete="current-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="mt-1"
						/>
					</div>
				</div>

				{error && <p className="mt-4 text-sm text-red-600">{error}</p>}

				<button
					type="submit"
					disabled={loading}
					className="mt-6 w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
				>
					{loading ? "Signing in..." : "Sign in"}
				</button>
			</form>
		</div>
	);
}
