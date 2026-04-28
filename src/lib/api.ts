import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const CSRF_COOKIE = "admin_csrf";
const CSRF_HEADER = "X-CSRF-Token";

export const api = axios.create({
	baseURL: API_URL,
	timeout: 30_000,
	withCredentials: true,
});

// Cache the last-seen CSRF cookie so we don't re-parse document.cookie on every
// request. The token rotates on login/refresh — we invalidate on those events
// (and on a 403 CSRF error) and re-read lazily.
let csrfCache: string | null = null;

function readCookie(name: string): string | null {
	const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
	return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function getCsrf(): string | null {
	if (csrfCache) return csrfCache;
	csrfCache = readCookie(CSRF_COOKIE);
	return csrfCache;
}

export function invalidateCsrfCache() {
	csrfCache = null;
}

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

api.interceptors.request.use((config) => {
	const method = (config.method ?? "get").toLowerCase();
	if (UNSAFE_METHODS.has(method)) {
		const csrf = getCsrf();
		if (csrf) {
			config.headers.set(CSRF_HEADER, csrf);
		}
	}
	return config;
});

// Auto-refresh on 401: queue concurrent requests behind a single in-flight
// /api/auth/refresh, then retry. If refresh itself fails, surface the original
// 401 so RequireAuth can route to /login.
let refreshing: Promise<boolean> | null = null;

// Optional callback the auth store wires up so the interceptor can null out
// user state immediately when refresh fails (avoids flashes of stale UI before
// RequireAuth notices). Kept loose to dodge a circular import store ↔ api.
let onAuthLost: (() => void) | null = null;
export function registerOnAuthLost(cb: () => void) {
	onAuthLost = cb;
}

async function performRefresh(): Promise<boolean> {
	try {
		await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
		// New cookies arrived — drop cached CSRF so the next unsafe request
		// re-reads the rotated value.
		invalidateCsrfCache();
		return true;
	} catch {
		return false;
	}
}

const NO_RETRY_PATHS = [
	"/api/auth/login",
	"/api/auth/setup",
	"/api/auth/refresh",
	"/api/auth/logout",
];

function pathOf(url: string): string {
	// Axios urls can be relative ("/api/...") or absolute. Strip baseURL/origin.
	if (url.startsWith("http")) {
		try {
			return new URL(url).pathname;
		} catch {
			return url;
		}
	}
	return url;
}

function isNoRetryPath(url: string | undefined): boolean {
	if (!url) return false;
	const p = pathOf(url);
	return NO_RETRY_PATHS.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

api.interceptors.response.use(
	(res) => res,
	async (err: AxiosError) => {
		const original = err.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
		const status = err.response?.status;

		// CSRF mismatch — likely cache stale after cookie rotation. Invalidate
		// and let the caller decide; we don't auto-retry to avoid surprising
		// idempotency issues on POST/PATCH/DELETE.
		if (status === 403 && err.response?.data) {
			const data = err.response.data as { error?: string };
			if (data.error?.toLowerCase().includes("csrf")) {
				invalidateCsrfCache();
			}
		}

		if (status === 401 && original && !original._retried && !isNoRetryPath(original.url)) {
			original._retried = true;
			refreshing ??= performRefresh().finally(() => {
				refreshing = null;
			});
			const ok = await refreshing;
			if (ok) {
				return api.request(original);
			}
			// Refresh failed — auth is fully lost. Tell the store so UI can react
			// without waiting for the next RequireAuth tick.
			onAuthLost?.();
		}

		return Promise.reject(err);
	},
);
