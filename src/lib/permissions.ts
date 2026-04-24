export const PERMISSIONS = {
	POST_WRITE_OWN: "post:write:own",
	POST_WRITE_ANY: "post:write:any",
	POST_PUBLISH_ANY: "post:publish:any",
	POST_DELETE_OWN: "post:delete:own",
	POST_DELETE_ANY: "post:delete:any",
	COMMENT_MODERATE: "comment:moderate",
	COMMENT_DELETE_ANY: "comment:delete:any",
	ANALYTICS_VIEW: "analytics:view",
	USER_MANAGE: "user:manage",
	ROLE_MANAGE: "role:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// User must have at least one of these to access the admin panel.
export const ADMIN_PANEL_PERMISSIONS: PermissionKey[] = [
	PERMISSIONS.POST_WRITE_OWN,
	PERMISSIONS.POST_WRITE_ANY,
	PERMISSIONS.POST_PUBLISH_ANY,
	PERMISSIONS.COMMENT_MODERATE,
	PERMISSIONS.ANALYTICS_VIEW,
	PERMISSIONS.USER_MANAGE,
	PERMISSIONS.ROLE_MANAGE,
];
