import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { rolesApi, type Permission, type RoleSummary } from "@/lib/queries";

export default function RolesPage() {
	return (
		<AppLayout>
			<RolesContent />
		</AppLayout>
	);
}

function RolesContent() {
	const qc = useQueryClient();
	const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });
	const permsQuery = useQuery({
		queryKey: ["roles", "permissions"],
		queryFn: rolesApi.listPermissions,
	});

	const [editing, setEditing] = useState<RoleSummary | null>(null);
	const [creating, setCreating] = useState(false);
	const [deleting, setDeleting] = useState<RoleSummary | null>(null);

	const removeMut = useMutation({
		mutationFn: rolesApi.remove,
		onSuccess: () => {
			toast.success("Role deleted");
			qc.invalidateQueries({ queryKey: ["roles"] });
			setDeleting(null);
		},
		onError: (err: { response?: { data?: { error?: string } } }) =>
			toast.error(err.response?.data?.error ?? "Delete failed"),
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Roles</h1>
					<p className="text-muted-foreground text-sm">
						Define roles and the permissions they grant.
					</p>
				</div>
				<Button onClick={() => setCreating(true)}>
					<Plus className="h-4 w-4" />
					New role
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All roles</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Key</TableHead>
								<TableHead>Permissions</TableHead>
								<TableHead className="w-[80px]">Users</TableHead>
								<TableHead className="w-[120px] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rolesQuery.isLoading && (
								<TableRow>
									<TableCell colSpan={5} className="text-muted-foreground text-center">
										Loading...
									</TableCell>
								</TableRow>
							)}
							{rolesQuery.data?.map((r) => (
								<TableRow key={r.id}>
									<TableCell className="font-medium">
										<div className="flex items-center gap-2">
											{r.name}
											{r.isSystem && (
												<span title="System role" className="text-muted-foreground">
													<Lock className="h-3 w-3" />
												</span>
											)}
										</div>
										{r.description && (
											<div className="text-muted-foreground mt-0.5 text-xs">{r.description}</div>
										)}
									</TableCell>
									<TableCell>
										<code className="bg-muted rounded px-1.5 py-0.5 text-xs">{r.key}</code>
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
											{r.permissions.length === 0 && (
												<span className="text-muted-foreground text-xs">—</span>
											)}
											{r.permissions.map((p) => (
												<Badge key={p} variant="outline" className="font-mono text-[10px]">
													{p}
												</Badge>
											))}
										</div>
									</TableCell>
									<TableCell>{r.userCount}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											aria-label="Edit role"
											title="Edit role"
											onClick={() => setEditing(r)}
										>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											aria-label="Delete role"
											title="Delete role"
											disabled={r.isSystem}
											onClick={() => setDeleting(r)}
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
				<RoleFormDialog
					open
					onOpenChange={(o) => !o && setCreating(false)}
					permissions={permsQuery.data ?? []}
				/>
			)}

			{editing && (
				<RoleFormDialog
					open
					onOpenChange={(o) => !o && setEditing(null)}
					permissions={permsQuery.data ?? []}
					role={editing}
				/>
			)}

			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => !o && setDeleting(null)}
				title="Delete role?"
				description={
					deleting && (
						<>
							This permanently deletes role <b>{deleting.name}</b>. Users assigned only to this role
							will lose its permissions. This cannot be undone.
						</>
					)
				}
				confirmLabel="Delete role"
				destructive
				loading={removeMut.isPending}
				onConfirm={() => deleting && removeMut.mutate(deleting.id)}
			/>
		</div>
	);
}

function RoleFormDialog({
	open,
	onOpenChange,
	permissions,
	role,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	permissions: Permission[];
	role?: RoleSummary;
}) {
	const qc = useQueryClient();
	const isEdit = !!role;

	const [key, setKey] = useState(role?.key ?? "");
	const [name, setName] = useState(role?.name ?? "");
	const [description, setDescription] = useState(role?.description ?? "");
	const [selected, setSelected] = useState<string[]>(role?.permissions ?? []);

	const mutation = useMutation({
		mutationFn: async () => {
			const payload = {
				key,
				name,
				description: description || null,
				permissionKeys: selected,
			};
			if (isEdit) return rolesApi.update(role!.id, payload);
			return rolesApi.create(payload);
		},
		onSuccess: () => {
			toast.success(isEdit ? "Role updated" : "Role created");
			qc.invalidateQueries({ queryKey: ["roles"] });
			onOpenChange(false);
		},
		onError: (err: { response?: { data?: { error?: string } } }) =>
			toast.error(err.response?.data?.error ?? "Save failed"),
	});

	function togglePerm(k: string) {
		setSelected((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
	}

	const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
		const group = p.key.split(":")[0];
		(acc[group] ??= []).push(p);
		return acc;
	}, {});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit role" : "New role"}</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Update role details and permissions."
							: "Create a role and choose its permissions."}
					</DialogDescription>
				</DialogHeader>

				<form
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						mutation.mutate();
					}}
				>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="key">Key</Label>
							<Input
								id="key"
								value={key}
								onChange={(e) => setKey(e.target.value)}
								pattern="[a-z0-9_]+"
								disabled={role?.isSystem}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="name">Display name</Label>
							<Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="description">Description</Label>
						<Input
							id="description"
							value={description ?? ""}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Permissions</Label>
						<div className="space-y-3 rounded-md border p-3">
							{Object.entries(grouped).map(([group, perms]) => (
								<div key={group}>
									<div className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
										{group}
									</div>
									<div className="space-y-1.5">
										{perms.map((p) => (
											<label key={p.key} className="flex items-start gap-2 text-sm">
												<Checkbox
													className="mt-0.5"
													checked={selected.includes(p.key)}
													onCheckedChange={() => togglePerm(p.key)}
												/>
												<div>
													<code className="text-xs">{p.key}</code>
													{p.description && (
														<div className="text-muted-foreground text-xs">{p.description}</div>
													)}
												</div>
											</label>
										))}
									</div>
								</div>
							))}
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
