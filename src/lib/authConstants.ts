// Mirrors blog-platform-backend/src/lib/cookies.ts (admin partition). When
// touching these, update the backend's COOKIE_NAMES table AND this file AND
// blog-platform-frontend/src/lib/authConstants.ts — see the cookies.ts banner.
// Header names are case-insensitive on the wire; we use the canonical X-*
// casing the backend also accepts.
export const APP_HEADER = "X-App-Client";
export const APP_KIND_ADMIN = "admin";
export const CSRF_HEADER = "X-CSRF-Token";
export const CSRF_COOKIE_NAME = "admin_csrf";
