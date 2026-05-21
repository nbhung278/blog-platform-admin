import { create } from "zustand";
import { AxiosError } from "axios";
import { api, invalidateCsrfCache, registerOnAuthLost } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { PermissionKey } from "@/lib/permissions";

export type AdminUser = {
	id: string;
	email: string;
	name: string;
	username: string;
	roles: string[];
	permissions: PermissionKey[];
	mustChangePassword: boolean;
};

type AuthState = {
	user: AdminUser | null;
	loading: boolean;
	initialized: boolean;
	// Cached result of /api/auth/setup-status so it's only fetched once per
	// page-load instead of every time a route mounts RequireAuth.
	setupChecked: boolean;
	needsSetup: boolean;
	login: (email: string, password: string) => Promise<void>;
	setup: (data: {
		email: string;
		password: string;
		name: string;
		username: string;
	}) => Promise<void>;
	logout: () => Promise<void>;
	loadMe: () => Promise<void>;
	checkSetupStatus: (force?: boolean) => Promise<void>;
	hasPermission: (perm: PermissionKey) => boolean;
	hasAnyPermission: (perms: PermissionKey[]) => boolean;
};

// Single-flight guard for loadMe + checkSetupStatus. React 19 StrictMode runs
// effects twice in dev and RequireAuth can race with route mounts; without
// this, /auth/me and /auth/setup-status both fire twice in parallel on cold
// load. The promises are cleared in `finally` so subsequent legitimate
// refreshes aren't blocked.
let inflightLoadMe: Promise<void> | null = null;
let inflightSetupCheck: Promise<void> | null = null;

export const useAuth = create<AuthState>((set, get) => ({
	user: null,
	loading: false,
	initialized: false,
	setupChecked: false,
	needsSetup: false,

	async login(email, password) {
		set({ loading: true });
		try {
			const { data } = await api.post("/api/auth/login", { email, password });
			invalidateCsrfCache();
			queryClient.clear();
			set({ user: data.user, initialized: true });
		} finally {
			set({ loading: false });
		}
	},

	async setup(data) {
		set({ loading: true });
		try {
			const res = await api.post("/api/auth/setup", data);
			invalidateCsrfCache();
			queryClient.clear();
			set({ user: res.data.user, initialized: true });
		} finally {
			set({ loading: false });
		}
	},

	async logout() {
		try {
			await api.post("/api/auth/logout");
		} catch {
			// best-effort: backend will eventually evict refresh token by TTL
		}
		invalidateCsrfCache();
		queryClient.clear();
		set({ user: null });
	},

	async loadMe() {
		if (inflightLoadMe) return inflightLoadMe;
		set({ loading: true });
		inflightLoadMe = (async () => {
			try {
				const { data } = await api.get("/api/auth/me");
				set({ user: data, initialized: true });
			} catch (err) {
				// Only treat an authoritative 401 (after the interceptor's refresh
				// attempt has also failed) as "logged out". Network errors, 5xx,
				// CORS failures etc. should leave `user` untouched so a transient
				// outage doesn't kick the user back to /login on every page load.
				const status = err instanceof AxiosError ? err.response?.status : undefined;
				if (status === 401) {
					set({ user: null, initialized: true });
				} else {
					// Mark initialized so RequireAuth can render its loading/error
					// state, but keep whatever `user` we already have.
					set({ initialized: true });
				}
			} finally {
				set({ loading: false });
				inflightLoadMe = null;
			}
		})();
		return inflightLoadMe;
	},

	async checkSetupStatus(force = false) {
		if (!force && get().setupChecked) return;
		if (inflightSetupCheck) return inflightSetupCheck;
		inflightSetupCheck = (async () => {
			try {
				const { data } = await api.get<{ needsSetup: boolean }>("/api/auth/setup-status");
				set({ needsSetup: data.needsSetup, setupChecked: true });
			} catch {
				// Backend offline → assume no setup needed so we don't trap the user
				// on /setup. RequireAuth will redirect to /login and the next request
				// will surface the real connectivity error.
				set({ setupChecked: true });
			} finally {
				inflightSetupCheck = null;
			}
		})();
		return inflightSetupCheck;
	},

	hasPermission(perm) {
		return get().user?.permissions.includes(perm) ?? false;
	},

	hasAnyPermission(perms) {
		const user = get().user;
		if (!user) return false;
		return perms.some((p) => user.permissions.includes(p));
	},
}));

// Wire the api interceptor's "auth lost" hook into the store. When the
// auto-refresh interceptor confirms we can't recover the session, clear user
// state immediately so the UI stops showing protected content.
registerOnAuthLost(() => {
	invalidateCsrfCache();
	queryClient.clear();
	useAuth.setState({ user: null, initialized: true });
});
