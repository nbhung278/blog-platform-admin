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
	login: (email: string, password: string) => Promise<void>;
	setup: (data: {
		email: string;
		password: string;
		name: string;
		username: string;
	}) => Promise<void>;
	logout: () => Promise<void>;
	loadMe: () => Promise<void>;
	hasPermission: (perm: PermissionKey) => boolean;
	hasAnyPermission: (perms: PermissionKey[]) => boolean;
};

export const useAuth = create<AuthState>((set, get) => ({
	user: null,
	loading: false,
	initialized: false,

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
		set({ loading: true });
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
		}
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
