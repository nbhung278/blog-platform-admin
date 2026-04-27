import { createRootRoute, createRoute } from "@tanstack/react-router";
import App from "@/App";
import HomePage from "./home";
import LoginPage from "./login";
import UsersPage from "./users";
import RolesPage from "./roles";
import SetupPage from "./setup";
import ChangePasswordPage from "./change-password";
import PostsPage from "./posts";
import { PostNewPage, PostEditPage } from "./post-editor";
import PostPreviewPage from "./post-preview";
import CategoriesPage from "./categories";

const rootRoute = createRootRoute({
	component: App,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: HomePage,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	component: LoginPage,
});

const usersRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/users",
	component: UsersPage,
});

const rolesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/roles",
	component: RolesPage,
});

const setupRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup",
	component: SetupPage,
});

const changePasswordRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/change-password",
	component: ChangePasswordPage,
});

const postsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/posts",
	component: PostsPage,
});

const postNewRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/posts/new",
	component: PostNewPage,
});

const postEditRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/posts/$id/edit",
	component: PostEditPage,
});

const postPreviewRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/posts/$id/preview",
	component: PostPreviewPage,
});

const categoriesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/categories",
	component: CategoriesPage,
});

export const routeTree = rootRoute.addChildren([
	indexRoute,
	loginRoute,
	setupRoute,
	changePasswordRoute,
	usersRoute,
	rolesRoute,
	postsRoute,
	postNewRoute,
	postEditRoute,
	postPreviewRoute,
	categoriesRoute,
]);
