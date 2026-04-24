import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/store/auth";
import { ADMIN_PANEL_PERMISSIONS } from "@/lib/permissions";
import { api } from "@/lib/api";

const PUBLIC_PATHS = new Set(["/login", "/setup"]);

export function RequireAuth({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const user = useAuth((s) => s.user);
	const initialized = useAuth((s) => s.initialized);
	const loadMe = useAuth((s) => s.loadMe);

	const [setupChecked, setSetupChecked] = useState(false);
	const [needsSetup, setNeedsSetup] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const { data } = await api.get<{ needsSetup: boolean }>("/api/auth/setup-status");
				setNeedsSetup(data.needsSetup);
			} catch {
				setNeedsSetup(false);
			} finally {
				setSetupChecked(true);
			}
			if (!initialized) await loadMe();
		})();
	}, [initialized, loadMe]);

	useEffect(() => {
		if (!setupChecked || !initialized) return;

		if (needsSetup) {
			if (pathname !== "/setup") navigate({ to: "/setup" });
			return;
		}

		if (!user) {
			if (!PUBLIC_PATHS.has(pathname)) navigate({ to: "/login" });
			return;
		}

		if (user.mustChangePassword && pathname !== "/change-password") {
			navigate({ to: "/change-password" });
			return;
		}

		const allowed = user.permissions.some((p) => ADMIN_PANEL_PERMISSIONS.includes(p));
		if (!allowed) {
			useAuth.getState().logout();
			navigate({ to: "/login" });
		}
	}, [setupChecked, initialized, needsSetup, user, pathname, navigate]);

	// Render children only when we have an authenticated user. Otherwise show
	// a loading state — the effects above will redirect to /setup or /login.
	if (!setupChecked || !initialized || !user || user.mustChangePassword) {
		return (
			<div className="text-muted-foreground flex min-h-screen items-center justify-center text-sm">
				Loading...
			</div>
		);
	}

	return <>{children}</>;
}
