// Mirrors blog-platform-backend/src/lib/cookies.ts. Header names are
// case-insensitive on the wire; we use the canonical X-* casing the backend
// also accepts. Cookie names match the backend's `admin` partition.
export const APP_HEADER = "X-App-Client";
export const APP_KIND_ADMIN = "admin";
export const CSRF_HEADER = "X-CSRF-Token";
export const CSRF_COOKIE_NAME = "admin_csrf";
