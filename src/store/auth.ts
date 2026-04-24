import { create } from "zustand";
import { api } from "@/lib/api";
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
	logout: () => void;
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
			localStorage.setItem("admin_token", data.token);
			set({ user: data.user, initialized: true });
		} finally {
			set({ loading: false });
		}
	},

	async setup(data) {
		set({ loading: true });
		try {
			const res = await api.post("/api/auth/setup", data);
			localStorage.setItem("admin_token", res.data.token);
			set({ user: res.data.user, initialized: true });
		} finally {
			set({ loading: false });
		}
	},

	logout() {
		localStorage.removeItem("admin_token");
		set({ user: null });
	},

	async loadMe() {
		const token = localStorage.getItem("admin_token");
		if (!token) {
			set({ initialized: true });
			return;
		}
		try {
			const { data } = await api.get("/api/auth/me");
			set({ user: data, initialized: true });
		} catch {
			localStorage.removeItem("admin_token");
			set({ user: null, initialized: true });
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
