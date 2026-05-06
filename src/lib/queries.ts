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

export type PostStatus = "draft" | "pending" | "published" | "rejected";

export type CategorySummary = {
	id: string;
	name: string;
	slug: string;
};

export type Category = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	postCount: number;
	createdAt: string;
	updatedAt: string;
};

export type PostListRow = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	coverUrl: string | null;
	status: PostStatus;
	publishedAt: string | null;
	readingTime: number;
	viewCount: number;
	likeCount: number;
	tags: string[];
	version: number;
	createdAt: string;
	updatedAt: string;
	user: { id: string; name: string; username: string; avatarUrl: string | null };
	categories: { category: CategorySummary }[];
};

export type PostFull = PostListRow & {
	contentMd: string;
	contentHtml: string;
	metaTitle: string | null;
	metaDesc: string | null;
};

export type PostInput = {
	title: string;
	contentMd: string;
	contentHtml: string;
	excerpt?: string;
	coverUrl?: string | null;
	status?: PostStatus;
	tags?: string[];
	metaTitle?: string;
	metaDesc?: string;
	categoryIds: string[];
};

export type PostsPage = {
	data: PostListRow[];
	total: number;
	page: number;
	limit: number;
};

export const postsApi = {
	list: (
		scope: "mine" | "all" = "mine",
		filters?: {
			status?: PostStatus;
			categoryId?: string;
			q?: string;
			page?: number;
			limit?: number;
		},
	) =>
		api
			.get<PostsPage>("/api/posts", {
				params: { scope, ...filters },
			})
			.then((r) => r.data),
	getById: (id: string) => api.get<PostFull>(`/api/posts/id/${id}`).then((r) => r.data),
	create: (data: PostInput) => api.post<PostFull>("/api/posts", data).then((r) => r.data),
	update: (id: string, data: Partial<PostInput> & { version: number }) =>
		api.patch<PostFull>(`/api/posts/${id}`, data).then((r) => r.data),
	remove: (id: string) => api.delete(`/api/posts/${id}`).then((r) => r.data),
	bulkRemove: (ids: string[]) =>
		api.post<{ deleted: number }>("/api/posts/bulk-delete", { ids }).then((r) => r.data),
};

export const categoriesApi = {
	list: () => api.get<Category[]>("/api/categories").then((r) => r.data),
	create: (data: { name: string; description?: string }) =>
		api.post<Category>("/api/categories", data).then((r) => r.data),
	update: (id: string, data: { name?: string; description?: string }) =>
		api.patch<Category>(`/api/categories/${id}`, data).then((r) => r.data),
	remove: (id: string) => api.delete(`/api/categories/${id}`).then((r) => r.data),
};

export const uploadsApi = {
	uploadImage: async (file: File): Promise<{ url: string }> => {
		const form = new FormData();
		form.append("file", file);
		const { data } = await api.post<{ url: string }>("/api/uploads/image", form);
		return data;
	},
	uploadFromUrl: async (url: string): Promise<{ url: string }> => {
		const { data } = await api.post<{ url: string }>("/api/uploads/from-url", { url });
		return data;
	},
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
