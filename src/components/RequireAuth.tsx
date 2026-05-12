import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/store/auth";
import { ADMIN_PANEL_PERMISSIONS } from "@/lib/permissions";

const PUBLIC_PATHS = new Set(["/login", "/setup"]);

export function RequireAuth({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const user = useAuth((s) => s.user);
	const initialized = useAuth((s) => s.initialized);
	const setupChecked = useAuth((s) => s.setupChecked);
	const needsSetup = useAuth((s) => s.needsSetup);
	const loadMe = useAuth((s) => s.loadMe);
	const checkSetupStatus = useAuth((s) => s.checkSetupStatus);

	// Initial bootstrap: setup-status + loadMe in parallel on first mount only.
	// Both calls are idempotent in the store (early-return if already done), so
	// remounting RequireAuth across route changes doesn't re-hit the network.
	useEffect(() => {
		void checkSetupStatus();
		if (!initialized) void loadMe();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// If the user transitions from logged-in → logged-out, re-check setup
	// status. Covers the rare case where the last admin deletes their own
	// account (or all users were wiped server-side) — we don't want them stuck
	// on /login when /setup is what they need.
	const wasLoggedInRef = useRef(false);
	useEffect(() => {
		if (user) {
			wasLoggedInRef.current = true;
			return;
		}
		if (!wasLoggedInRef.current) return;
		wasLoggedInRef.current = false;
		void checkSetupStatus(true);
	}, [user, checkSetupStatus]);

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
			void useAuth.getState().logout();
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
