import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { isPasswordValid } from "@/lib/password-rules";
import { rolesApi, usersApi, type AdminUserRow } from "@/lib/queries";
import { useAuth } from "@/store/auth";

export default function UsersPage() {
	return (
		<AppLayout>
			<UsersContent />
			<Toaster richColors position="top-right" />
		</AppLayout>
	);
}

function UsersContent() {
	const me = useAuth((s) => s.user)!;
	const qc = useQueryClient();

	const usersQuery = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
	const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });

	const [editing, setEditing] = useState<AdminUserRow | null>(null);
	const [creating, setCreating] = useState(false);
	const [deleting, setDeleting] = useState<AdminUserRow | null>(null);

	const removeMut = useMutation({
		mutationFn: usersApi.remove,
		onSuccess: () => {
			toast.success("User deleted");
			qc.invalidateQueries({ queryKey: ["users"] });
			setDeleting(null);
		},
		onError: (err: { response?: { data?: { error?: string } } }) =>
			toast.error(err.response?.data?.error ?? "Delete failed"),
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Users</h1>
					<p className="text-muted-foreground text-sm">Manage users and assign roles.</p>
				</div>
				<Button onClick={() => setCreating(true)}>
					<Plus className="h-4 w-4" />
					New user
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All users</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Username</TableHead>
								<TableHead>Roles</TableHead>
								<TableHead className="w-[120px] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{usersQuery.isLoading && (
								<TableRow>
									<TableCell colSpan={5} className="text-muted-foreground text-center">
										Loading...
									</TableCell>
								</TableRow>
							)}
							{usersQuery.data?.map((u) => (
								<TableRow key={u.id}>
									<TableCell className="font-medium">{u.name}</TableCell>
									<TableCell>{u.email}</TableCell>
									<TableCell className="text-muted-foreground">@{u.username}</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
											{u.roles.length === 0 && (
												<span className="text-muted-foreground text-xs">—</span>
											)}
											{u.roles.map((r) => (
												<Badge key={r.id} variant="secondary">
													{r.name}
												</Badge>
											))}
										</div>
									</TableCell>
									<TableCell className="text-right">
										<Button variant="ghost" size="icon" onClick={() => setEditing(u)}>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											disabled={u.id === me.id}
											onClick={() => setDeleting(u)}
										>
											<Trash2 className="text-destructive h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{creating && (
				<UserFormDialog
					open
					onOpenChange={(o) => !o && setCreating(false)}
					roles={rolesQuery.data ?? []}
				/>
			)}

			{editing && (
				<UserFormDialog
					open
					onOpenChange={(o) => !o && setEditing(null)}
					roles={rolesQuery.data ?? []}
					user={editing}
				/>
			)}

			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => !o && setDeleting(null)}
				title="Delete user?"
				description={
					deleting && (
						<>
							This permanently deletes <b>{deleting.email}</b> and all of their posts, comments, and
							chat sessions. This cannot be undone.
						</>
					)
				}
				confirmLabel="Delete user"
				destructive
				loading={removeMut.isPending}
				onConfirm={() => deleting && removeMut.mutate(deleting.id)}
			/>
		</div>
	);
}

function UserFormDialog({
	open,
	onOpenChange,
	roles,
	user,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	roles: { id: string; name: string }[];
	user?: AdminUserRow;
}) {
	const qc = useQueryClient();
	const isEdit = !!user;

	const [email, setEmail] = useState(user?.email ?? "");
	const [name, setName] = useState(user?.name ?? "");
	const [username, setUsername] = useState(user?.username ?? "");
	const [password, setPassword] = useState("");
	const [roleIds, setRoleIds] = useState<string[]>(user?.roles.map((r) => r.id) ?? []);

	const mutation = useMutation({
		mutationFn: async () => {
			if (isEdit) {
				return usersApi.update(user!.id, {
					email,
					name,
					username,
					...(password ? { password } : {}),
					roleIds,
				});
			}
			return usersApi.create({ email, name, username, password, roleIds });
		},
		onSuccess: () => {
			toast.success(isEdit ? "User updated" : "User created");
			qc.invalidateQueries({ queryKey: ["users"] });
			onOpenChange(false);
		},
		onError: (err: { response?: { data?: { error?: string } } }) =>
			toast.error(err.response?.data?.error ?? "Save failed"),
	});

	function toggleRole(id: string) {
		setRoleIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
					<DialogDescription>
						{isEdit ? "Update user details and role assignments." : "Create a new account."}
					</DialogDescription>
				</DialogHeader>

				<form
					className="space-y-4"
					autoComplete="off"
					onSubmit={(e) => {
						e.preventDefault();
						mutation.mutate();
					}}
				>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="name">Name</Label>
							<Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								pattern="[a-z0-9-]+"
								required
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="password">
							{isEdit ? "New password (leave blank to keep)" : "Password"}
						</Label>
						<PasswordInput
							id="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required={!isEdit}
						/>
						{(!isEdit || password.length > 0) && <PasswordRequirements value={password} />}
					</div>

					<div className="space-y-2">
						<Label>Roles</Label>
						<div className="space-y-2 rounded-md border p-3">
							{roles.length === 0 && (
								<p className="text-muted-foreground text-xs">No roles defined yet.</p>
							)}
							{roles.map((r) => (
								<label key={r.id} className="flex items-center gap-2 text-sm">
									<Checkbox
										checked={roleIds.includes(r.id)}
										onCheckedChange={() => toggleRole(r.id)}
									/>
									{r.name}
								</label>
							))}
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								mutation.isPending ||
								((!isEdit || password.length > 0) && !isPasswordValid(password))
							}
						>
							{mutation.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
