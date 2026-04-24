import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/store/auth";

export default function HomePage() {
	return (
		<AppLayout>
			<HomeContent />
		</AppLayout>
	);
}

function HomeContent() {
	const user = useAuth((s) => s.user)!;

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-semibold">Dashboard</h1>
				<p className="text-muted-foreground text-sm">Welcome back, {user.name}.</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Account</CardTitle>
						<CardDescription>Your profile and roles.</CardDescription>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<dt className="text-muted-foreground">Name</dt>
								<dd className="font-medium">{user.name}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Email</dt>
								<dd className="font-medium">{user.email}</dd>
							</div>
							<div className="col-span-2">
								<dt className="text-muted-foreground">Roles</dt>
								<dd className="mt-1 flex flex-wrap gap-1">
									{user.roles.length === 0 && (
										<span className="text-muted-foreground text-xs">—</span>
									)}
									{user.roles.map((r) => (
										<Badge key={r} variant="secondary">
											{r}
										</Badge>
									))}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Permissions</CardTitle>
						<CardDescription>Effective permissions from all your roles.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-1">
							{user.permissions.map((p) => (
								<Badge key={p} variant="outline" className="font-mono text-[10px]">
									{p}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
