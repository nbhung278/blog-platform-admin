import { createRootRoute, createRoute } from "@tanstack/react-router";
import App from "@/App";
import HomePage from "./home";

const rootRoute = createRootRoute({
	component: App,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: HomePage,
});

export const routeTree = rootRoute.addChildren([indexRoute]);
