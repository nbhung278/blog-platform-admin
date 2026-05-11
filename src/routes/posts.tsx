import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	useReactTable,
	getCoreRowModel,
	type ColumnDef,
	type PaginationState,
	type RowSelectionState,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash2, Eye, Search, X, Check, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { postsApi, categoriesApi, type PostListRow, type PostStatus } from "@/lib/queries";
import { useAuth } from "@/store/auth";
import { PERMISSIONS, POST_WRITE_PERMISSIONS } from "@/lib/permissions";

const STATUS_VARIANT: Record<PostStatus, "default" | "secondary" | "outline" | "destructive"> = {
	draft: "outline",
	pending: "secondary",
	published: "default",
	rejected: "destructive",
};

export default function PostsPage() {
	return (
		<AppLayout>
			<PostsContent />
		</AppLayout>
	);
}

function PostsContent() {
	const me = useAuth((s) => s.user)!;
	const navigate = useNavigate();
	const canWrite = POST_WRITE_PERMISSIONS.some((p) => me.permissions.includes(p));
	const canSeeAll =
		me.permissions.includes(PERMISSIONS.POST_WRITE_ANY) ||
		me.permissions.includes(PERMISSIONS.POST_REVIEW);
	const canReview =
		me.permissions.includes(PERMISSIONS.POST_REVIEW) ||
		me.permissions.includes(PERMISSIONS.POST_PUBLISH_ANY);
	const canPublish = me.permissions.includes(PERMISSIONS.POST_PUBLISH_ANY);

	const [tab, setTab] = useState<"mine" | "all" | "review">("all");
	const [search, setSearch] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const qc = useQueryClient();

	const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });

	const postsQuery = useQuery({
		queryKey: ["posts", tab, search, categoryId, pagination.pageIndex, pagination.pageSize],
		queryFn: () =>
			postsApi.list(tab === "review" ? "all" : tab, {
				q: search || undefined,
				categoryId: categoryId || undefined,
				status: tab === "review" ? "pending" : undefined,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			}),
		refetchInterval: 30_000,
	});

	const reviewMut = useMutation({
		mutationFn: (vars: { id: string; version: number; status: PostStatus }) =>
			postsApi.update(vars.id, { version: vars.version, status: vars.status }),
		onSuccess: (_data, vars) => {
			toast.success(vars.status === "published" ? "Post approved & published" : "Post rejected");
			qc.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (err: { response?: { data?: { error?: string }; status?: number } }) => {
			if (err.response?.status === 409) {
				toast.error("Conflict: post was modified — refresh and retry");
				return;
			}
			toast.error(err.response?.data?.error ?? "Action failed");
		},
	});

	const rows = postsQuery.data?.data ?? [];
	const total = postsQuery.data?.total ?? 0;

	const [deleting, setDeleting] = useState<PostListRow | null>(null);
	const [bulkDeleting, setBulkDeleting] = useState(false);

	const removeMut = useMutation({
		mutationFn: postsApi.remove,
		onSuccess: () => {
			toast.success("Post deleted");
			qc.invalidateQueries({ queryKey: ["posts"] });
			setDeleting(null);
		},
		onError: (err: { response?: { data?: { error?: string } } }) =>
			toast.error(err.response?.data?.error ?? "Delete failed"),
	});

	const bulkRemoveMut = useMutation({
		mutationFn: postsApi.bulkRemove,
		onSuccess: (data) => {
			toast.success(`${data.deleted} post${data.deleted > 1 ? "s" : ""} deleted`);
			qc.invalidateQueries({ queryKey: ["posts"] });
			setRowSelection({});
			setBulkDeleting(false);
		},
		onError: (err: { response?: { data?: { error?: string } } }) => {
			toast.error(err.response?.data?.error ?? "Bulk delete failed");
			setBulkDeleting(false);
		},
	});

	const canDeleteAny = me.permissions.includes(PERMISSIONS.POST_DELETE_ANY);
	const canDeleteOwn = me.permissions.includes(PERMISSIONS.POST_DELETE_OWN);

	const reviewColumns = useMemo<ColumnDef<PostListRow>[]>(
		() => [
			{
				accessorKey: "title",
				header: "Title",
				cell: ({ row }) => {
					const p = row.original;
					return (
						<div className="font-medium">
							<div>{p.title}</div>
							{p.categories.length > 0 && (
								<div className="mt-0.5 flex flex-wrap gap-1">
									{p.categories.map((c) => (
										<Badge key={c.category.id} variant="outline" className="text-[10px]">
											{c.category.name}
										</Badge>
									))}
								</div>
							)}
						</div>
					);
				},
			},
			{
				id: "author",
				header: "Author",
				size: 160,
				cell: ({ row }) => (
					<span className="text-muted-foreground">@{row.original.user.username}</span>
				),
			},
			{
				accessorKey: "updatedAt",
				header: "Submitted",
				size: 160,
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs">
						{new Date(row.original.updatedAt).toLocaleString()}
					</span>
				),
			},
			{
				id: "actions",
				header: () => <div className="text-right">Review</div>,
				size: 220,
				cell: ({ row }) => {
					const p = row.original;
					const inFlight = reviewMut.isPending && reviewMut.variables?.id === p.id;
					return (
						<div className="flex justify-end gap-1.5">
							<Button asChild variant="ghost" size="icon" title="Preview">
								<Link to="/posts/$id/preview" params={{ id: p.id }} target="_blank">
									<Eye className="h-4 w-4" />
								</Link>
							</Button>
							<Button asChild variant="ghost" size="icon" title="Open in editor">
								<Link to="/posts/$id/edit" params={{ id: p.id }}>
									<Pencil className="h-4 w-4" />
								</Link>
							</Button>
							{canPublish && (
								<>
									<Button
										variant="ghost"
										size="icon"
										disabled={inFlight}
										title="Reject"
										aria-label="Reject"
										className="text-red-600 hover:bg-red-50 hover:text-red-700"
										onClick={() =>
											reviewMut.mutate({ id: p.id, version: p.version, status: "rejected" })
										}
									>
										<XCircle className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										disabled={inFlight}
										title="Approve"
										aria-label="Approve"
										className="text-green-600 hover:bg-green-50 hover:text-green-700"
										onClick={() =>
											reviewMut.mutate({ id: p.id, version: p.version, status: "published" })
										}
									>
										<Check className="h-4 w-4" />
									</Button>
								</>
							)}
						</div>
					);
				},
			},
		],
		[canPublish, reviewMut],
	);

	const columns = useMemo<ColumnDef<PostListRow>[]>(
		() => [
			{
				id: "select",
				size: 40,
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() ? "indeterminate" : false)
						}
						onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(v) => row.toggleSelected(!!v)}
						aria-label="Select row"
					/>
				),
				enableSorting: false,
			},
			{
				accessorKey: "title",
				header: "Title",
				cell: ({ row }) => {
					const p = row.original;
					return (
						<div className="font-medium">
							<div>{p.title}</div>
							{p.categories.length > 0 && (
								<div className="mt-0.5 flex flex-wrap gap-1">
									{p.categories.map((c) => (
										<Badge key={c.category.id} variant="outline" className="text-[10px]">
											{c.category.name}
										</Badge>
									))}
								</div>
							)}
						</div>
					);
				},
			},
			...(tab === "all"
				? [
						{
							id: "author",
							header: "Author",
							size: 140,
							cell: ({ row }: { row: { original: PostListRow } }) => (
								<span className="text-muted-foreground">@{row.original.user.username}</span>
							),
						} satisfies ColumnDef<PostListRow>,
					]
				: []),
			{
				accessorKey: "status",
				header: "Status",
				size: 110,
				cell: ({ row }) => (
					<Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>
				),
			},
			{
				accessorKey: "viewCount",
				header: () => <div className="text-right">Views</div>,
				size: 80,
				cell: ({ row }) => <div className="text-right tabular-nums">{row.original.viewCount}</div>,
			},
			{
				accessorKey: "updatedAt",
				header: "Updated",
				size: 160,
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs">
						{new Date(row.original.updatedAt).toLocaleString()}
					</span>
				),
			},
			{
				id: "actions",
				header: () => <div className="text-right">Actions</div>,
				size: 140,
				cell: ({ row }) => {
					const p = row.original;
					const isOwner = p.user.id === me.id;
					const canDelete = canDeleteAny || (isOwner && canDeleteOwn);
					return (
						<div className="text-right">
							<Button asChild variant="ghost" size="icon" title="Preview">
								<Link to="/posts/$id/preview" params={{ id: p.id }} target="_blank">
									<Eye className="h-4 w-4" />
								</Link>
							</Button>
							<Button asChild variant="ghost" size="icon" title="Edit">
								<Link to="/posts/$id/edit" params={{ id: p.id }}>
									<Pencil className="h-4 w-4" />
								</Link>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								title="Delete"
								disabled={!canDelete}
								onClick={() => setDeleting(p)}
							>
								<Trash2 className="text-destructive h-4 w-4" />
							</Button>
						</div>
					);
				},
			},
		],
		[tab, me.id, canDeleteAny, canDeleteOwn],
	);

	const activeColumns = tab === "review" ? reviewColumns : columns;
	const table = useReactTable({
		data: rows,
		columns: activeColumns,
		rowCount: total,
		pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
		state: { pagination, rowSelection: tab === "review" ? {} : rowSelection },
		onPaginationChange: (updater) => {
			setPagination(updater);
			setRowSelection({});
		},
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		getRowId: (row) => row.id,
	});

	const selectedIds = Object.keys(rowSelection);

	function resetFilters() {
		setSearch("");
		setCategoryId("");
		setPagination((p) => ({ ...p, pageIndex: 0 }));
		setRowSelection({});
	}

	const hasFilters = search !== "" || categoryId !== "";

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Posts</h1>
					<p className="text-muted-foreground text-sm">Write, review and publish blog posts.</p>
				</div>
				{canWrite && (
					<Button onClick={() => navigate({ to: "/posts/new" })}>
						<Plus className="h-4 w-4" />
						New post
					</Button>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<div className="relative">
					<Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
					<Input
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPagination((p) => ({ ...p, pageIndex: 0 }));
							setRowSelection({});
						}}
						placeholder="Search title..."
						className="h-9 w-56 pl-8"
					/>
				</div>

				<Select
					value={categoryId || "__all__"}
					onValueChange={(val) => {
						setCategoryId(val === "__all__" ? "" : val);
						setPagination((p) => ({ ...p, pageIndex: 0 }));
						setRowSelection({});
					}}
				>
					<SelectTrigger className="h-9 w-44">
						<SelectValue placeholder="All categories" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__all__">All categories</SelectItem>
						{categoriesQuery.data?.map((cat) => (
							<SelectItem key={cat.id} value={cat.id}>
								{cat.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{hasFilters && (
					<Button variant="ghost" size="sm" onClick={resetFilters}>
						<X className="h-3.5 w-3.5" />
						Clear
					</Button>
				)}

				{selectedIds.length > 0 && (
					<div className="ml-auto flex items-center gap-2">
						<Button variant="destructive" size="sm" onClick={() => setBulkDeleting(true)}>
							<Trash2 className="h-4 w-4" />
							Delete {selectedIds.length} selected
						</Button>
					</div>
				)}
			</div>

			<Tabs
				value={tab}
				onValueChange={(v) => {
					setTab(v as "mine" | "all" | "review");
					setPagination((p) => ({ ...p, pageIndex: 0 }));
					setRowSelection({});
				}}
			>
				<TabsList>
					{canSeeAll && <TabsTrigger value="all">All posts</TabsTrigger>}
					<TabsTrigger value="mine">My posts</TabsTrigger>
					{canReview && <TabsTrigger value="review">Pending review</TabsTrigger>}
				</TabsList>
				<TabsContent value={tab}>
					<Card>
						<CardContent className="pt-6">
							<DataTable
								table={table}
								columns={activeColumns}
								loading={postsQuery.isLoading}
								emptyText={tab === "review" ? "No posts waiting for review." : "No posts found."}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => !o && setDeleting(null)}
				title="Delete post?"
				description={
					deleting && (
						<>
							This permanently deletes <b>{deleting.title}</b>. This cannot be undone.
						</>
					)
				}
				confirmLabel="Delete"
				destructive
				loading={removeMut.isPending}
				onConfirm={() => deleting && removeMut.mutate(deleting.id)}
			/>

			<ConfirmDialog
				open={bulkDeleting}
				onOpenChange={(o) => !o && setBulkDeleting(false)}
				title={`Delete ${selectedIds.length} post${selectedIds.length > 1 ? "s" : ""}?`}
				description={
					<>
						<span>This permanently deletes the following posts and cannot be undone:</span>
						<ul className="mt-2 max-h-40 overflow-y-auto">
							{rows
								.filter((r) => selectedIds.includes(r.id))
								.map((r) => (
									<li key={r.id} className="truncate text-sm font-medium">
										• {r.title}
									</li>
								))}
						</ul>
					</>
				}
				confirmLabel="Delete all"
				destructive
				loading={bulkRemoveMut.isPending}
				onConfirm={() => bulkRemoveMut.mutate(selectedIds)}
			/>
		</div>
	);
}
