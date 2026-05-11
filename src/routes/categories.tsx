import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { categoriesApi, type Category } from "@/lib/queries";
import { useAuth } from "@/store/auth";
import { PERMISSIONS } from "@/lib/permissions";

export default function CategoriesPage() {
	const hasPermission = useAuth((s) => s.hasPermission);
	return (
		<AppLayout>
			{hasPermission(PERMISSIONS.ROLE_MANAGE) ? (
				<CategoriesContent />
			) : (
				<div className="text-muted-foreground py-20 text-center text-sm">
					You don't have permission to manage categories.
				</div>
			)}
		</AppLayout>
	);
}

function CategoriesContent() {
	const qc = useQueryClient();
	const query = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });

	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState<Category | null>(null);
	const [deleting, setDeleting] = useState<Category | null>(null);

	const removeMut = useMutation({
		mutationFn: categoriesApi.remove,
		onSuccess: () => {
			toast.success("Category deleted");
			qc.invalidateQueries({ queryKey: ["categories"] });
			setDeleting(null);
		},
		onError: (err: { response?: { data?: { error?: string } } }) =>
			toast.error(err.response?.data?.error ?? "Delete failed"),
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Categories</h1>
					<p className="text-muted-foreground text-sm">Manage post categories.</p>
				</div>
				<Button onClick={() => setCreating(true)}>
					<Plus className="h-4 w-4" />
					New category
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All categories</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Slug</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="w-[80px] text-right">Posts</TableHead>
								<TableHead className="w-[120px] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{query.isLoading && (
								<TableRow>
									<TableCell colSpan={5} className="text-muted-foreground text-center">
										Loading...
									</TableCell>
								</TableRow>
							)}
							{query.data?.length === 0 && (
								<TableRow>
									<TableCell colSpan={5} className="text-muted-foreground text-center">
										No categories yet.
									</TableCell>
								</TableRow>
							)}
							{query.data?.map((cat) => (
								<TableRow key={cat.id}>
									<TableCell className="font-medium">{cat.name}</TableCell>
									<TableCell>
										<code className="bg-muted rounded px-1.5 py-0.5 text-xs">{cat.slug}</code>
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{cat.description ?? "—"}
									</TableCell>
									<TableCell className="text-right tabular-nums">{cat.postCount}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											aria-label="Edit category"
											title="Edit category"
											onClick={() => setEditing(cat)}
										>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											disabled={cat.postCount > 0}
											aria-label="Delete category"
											title={
												cat.postCount > 0
													? `Cannot delete: ${cat.postCount} post(s) assigned`
													: "Delete category"
											}
											onClick={() => setDeleting(cat)}
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

			{creating && <CategoryFormDialog open onOpenChange={(o) => !o && setCreating(false)} />}

			{editing && (
				<CategoryFormDialog open onOpenChange={(o) => !o && setEditing(null)} category={editing} />
			)}

			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => !o && setDeleting(null)}
				title="Delete category?"
				description={
					deleting && (
						<span className="space-y-1">
							<span className="block">
								Permanently delete <b>{deleting.name}</b>?
							</span>
							{deleting.postCount > 0 ? (
								<span className="text-destructive block text-sm">
									Cannot delete: {deleting.postCount} post
									{deleting.postCount > 1 ? "s are" : " is"} still assigned to this category.
									Reassign them first.
								</span>
							) : (
								<span className="block text-sm">This cannot be undone.</span>
							)}
						</span>
					)
				}
				confirmLabel="Delete category"
				destructive
				loading={removeMut.isPending}
				confirmDisabled={!!deleting && deleting.postCount > 0}
				onConfirm={() => deleting && removeMut.mutate(deleting.id)}
			/>
		</div>
	);
}

function CategoryFormDialog({
	open,
	onOpenChange,
	category,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	category?: Category;
}) {
	const qc = useQueryClient();
	const isEdit = !!category;

	const [name, setName] = useState(category?.name ?? "");
	const [description, setDescription] = useState(category?.description ?? "");

	const mutation = useMutation({
		mutationFn: () => {
			const payload = { name: name.trim(), description: description.trim() || undefined };
			if (isEdit) return categoriesApi.update(category!.id, payload);
			return categoriesApi.create(payload);
		},
		onSuccess: () => {
			toast.success(isEdit ? "Category updated" : "Category created");
			qc.invalidateQueries({ queryKey: ["categories"] });
			onOpenChange(false);
		},
		onError: (err: { response?: { data?: { error?: string } } }) =>
			toast.error(err.response?.data?.error ?? "Save failed"),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
					<DialogDescription>
						{isEdit ? "Update category details." : "Create a new post category."}
					</DialogDescription>
				</DialogHeader>

				<form
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						mutation.mutate();
					}}
				>
					<div className="space-y-1.5">
						<Label htmlFor="cat-name">Name</Label>
						<Input
							id="cat-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Technology"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="cat-desc">Description</Label>
						<Input
							id="cat-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional short description"
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={mutation.isPending || name.trim().length === 0}>
							{mutation.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
