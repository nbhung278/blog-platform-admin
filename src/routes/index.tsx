import { createRootRoute, createRoute } from "@tanstack/react-router";
import App from "@/App";
import HomePage from "./home";
import LoginPage from "./login";
import UsersPage from "./users";
import RolesPage from "./roles";
import SetupPage from "./setup";
import ChangePasswordPage from "./change-password";

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

export const routeTree = rootRoute.addChildren([
	indexRoute,
	loginRoute,
	setupRoute,
	changePasswordRoute,
	usersRoute,
	rolesRoute,
]);
