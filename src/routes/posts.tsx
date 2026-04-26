import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Eye } from "lucide-react";
import { toast, Toaster } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { postsApi, type PostListRow, type PostStatus } from "@/lib/queries";
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
			<Toaster richColors position="top-right" />
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

	const [tab, setTab] = useState<"mine" | "all">("mine");
	const scope = tab;

	const qc = useQueryClient();
	const postsQuery = useQuery({
		queryKey: ["posts", scope],
		queryFn: () => postsApi.list(scope),
		// Pick up freshly flushed view counts (and Redis pending) without manual reload.
		refetchInterval: 30_000,
	});

	const [deleting, setDeleting] = useState<PostListRow | null>(null);
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

			<Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "all")}>
				<TabsList>
					<TabsTrigger value="mine">My posts</TabsTrigger>
					{canSeeAll && <TabsTrigger value="all">All posts</TabsTrigger>}
				</TabsList>
				<TabsContent value={tab}>
					<Card>
						<CardContent className="pt-6">
							<PostsTable
								loading={postsQuery.isLoading}
								rows={postsQuery.data ?? []}
								onDelete={setDeleting}
								showAuthor={tab === "all"}
								meId={me.id}
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
		</div>
	);
}

function PostsTable({
	loading,
	rows,
	onDelete,
	showAuthor,
	meId,
}: {
	loading: boolean;
	rows: PostListRow[];
	onDelete: (p: PostListRow) => void;
	showAuthor: boolean;
	meId: string;
}) {
	const me = useAuth((s) => s.user)!;
	const canDeleteAny = me.permissions.includes(PERMISSIONS.POST_DELETE_ANY);
	const canDeleteOwn = me.permissions.includes(PERMISSIONS.POST_DELETE_OWN);

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Title</TableHead>
					{showAuthor && <TableHead>Author</TableHead>}
					<TableHead className="w-[110px]">Status</TableHead>
					<TableHead className="w-[80px] text-right">Views</TableHead>
					<TableHead className="w-[160px]">Updated</TableHead>
					<TableHead className="w-[140px] text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{loading && (
					<TableRow>
						<TableCell colSpan={showAuthor ? 6 : 5} className="text-muted-foreground text-center">
							Loading...
						</TableCell>
					</TableRow>
				)}
				{!loading && rows.length === 0 && (
					<TableRow>
						<TableCell colSpan={showAuthor ? 6 : 5} className="text-muted-foreground text-center">
							No posts yet.
						</TableCell>
					</TableRow>
				)}
				{rows.map((p) => {
					const isOwner = p.user.id === meId;
					const canDelete = canDeleteAny || (isOwner && canDeleteOwn);
					return (
						<TableRow key={p.id}>
							<TableCell className="font-medium">{p.title}</TableCell>
							{showAuthor && (
								<TableCell className="text-muted-foreground">@{p.user.username}</TableCell>
							)}
							<TableCell>
								<Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
							</TableCell>
							<TableCell className="text-right tabular-nums">{p.viewCount}</TableCell>
							<TableCell className="text-muted-foreground text-xs">
								{new Date(p.updatedAt).toLocaleString()}
							</TableCell>
							<TableCell className="text-right">
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
									onClick={() => onDelete(p)}
								>
									<Trash2 className="text-destructive h-4 w-4" />
								</Button>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
