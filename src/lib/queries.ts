import { api } from "./api";

export type RoleSummary = {
	id: string;
	key: string;
	name: string;
	description: string | null;
	isSystem: boolean;
	userCount: number;
	permissions: string[];
};

export type Permission = {
	id: string;
	key: string;
	description: string | null;
};

export type AdminUserRow = {
	id: string;
	email: string;
	name: string;
	username: string;
	plan: string;
	createdAt: string;
	roles: { id: string; key: string; name: string }[];
};

export const usersApi = {
	list: () => api.get<AdminUserRow[]>("/api/users").then((r) => r.data),
	create: (data: {
		email: string;
		password: string;
		name: string;
		username: string;
		roleIds: string[];
	}) => api.post("/api/users", data).then((r) => r.data),
	update: (
		id: string,
		data: Partial<{
			email: string;
			name: string;
			username: string;
			password: string;
			roleIds: string[];
		}>,
	) => api.patch(`/api/users/${id}`, data).then((r) => r.data),
	remove: (id: string) => api.delete(`/api/users/${id}`).then((r) => r.data),
};

export const rolesApi = {
	list: () => api.get<RoleSummary[]>("/api/roles").then((r) => r.data),
	listPermissions: () => api.get<Permission[]>("/api/roles/permissions").then((r) => r.data),
	create: (data: {
		key: string;
		name: string;
		description?: string | null;
		permissionKeys: string[];
	}) => api.post("/api/roles", data).then((r) => r.data),
	update: (
		id: string,
		data: Partial<{
			key: string;
			name: string;
			description: string | null;
			permissionKeys: string[];
		}>,
	) => api.patch(`/api/roles/${id}`, data).then((r) => r.data),
	remove: (id: string) => api.delete(`/api/roles/${id}`).then((r) => r.data),
};
