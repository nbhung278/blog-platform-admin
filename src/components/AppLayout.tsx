import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, Users, ShieldCheck, LogOut, FileText, Tag } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/store/auth";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
	to: string;
	label: string;
	icon: typeof Home;
	requires?: PermissionKey;
	requiresAny?: PermissionKey[];
};

const NAV: NavItem[] = [
	{ to: "/", label: "Dashboard", icon: Home },
	{
		to: "/posts",
		label: "Posts",
		icon: FileText,
		requiresAny: [PERMISSIONS.POST_WRITE_OWN, PERMISSIONS.POST_WRITE_ANY, PERMISSIONS.POST_REVIEW],
	},
	{
		to: "/categories",
		label: "Categories",
		icon: Tag,
		requiresAny: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.POST_WRITE_ANY],
	},
	{ to: "/users", label: "Users", icon: Users, requires: PERMISSIONS.USER_MANAGE },
	{ to: "/roles", label: "Roles", icon: ShieldCheck, requires: PERMISSIONS.ROLE_MANAGE },
];

export function AppLayout({ children }: { children: ReactNode }) {
	return (
		<RequireAuth>
			<LayoutInner>{children}</LayoutInner>
		</RequireAuth>
	);
}

function LayoutInner({ children }: { children: ReactNode }) {
	const user = useAuth((s) => s.user)!;
	const logoutStore = useAuth((s) => s.logout);
	const queryClient = useQueryClient();
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	function logout() {
		logoutStore();
		queryClient.clear();
	}

	return (
		<div className="flex min-h-screen">
			<aside className="bg-card flex w-60 flex-col border-r">
				<div className="border-b p-4">
					<div className="text-sm font-semibold">Blog Admin</div>
					<div className="text-muted-foreground mt-0.5 truncate text-xs">{user.email}</div>
				</div>

				<nav className="flex-1 space-y-1 p-2">
					{NAV.filter((n) => {
						if (n.requires && !user.permissions.includes(n.requires)) return false;
						if (n.requiresAny && !n.requiresAny.some((p) => user.permissions.includes(p)))
							return false;
						return true;
					}).map((n) => {
						const Icon = n.icon;
						const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
						return (
							<Link
								key={n.to}
								to={n.to}
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
									active
										? "bg-secondary text-secondary-foreground"
										: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
								{n.label}
							</Link>
						);
					})}
				</nav>

				<div className="border-t p-2">
					<Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
						<LogOut className="h-4 w-4" />
						Sign out
					</Button>
				</div>
			</aside>

			<main className="bg-background flex-1 overflow-auto p-6">{children}</main>
		</div>
	);
}
