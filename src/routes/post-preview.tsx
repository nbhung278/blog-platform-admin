import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useAuth } from "@/store/auth";
import { postsApi } from "@/lib/queries";
import { sanitizeHtml } from "@/lib/sanitize";
import { Badge } from "@/components/ui/badge";

export default function PostPreviewPage() {
	const { id } = useParams({ from: "/posts/$id/preview" });
	const initialized = useAuth((s) => s.initialized);
	const user = useAuth((s) => s.user);
	const loadMe = useAuth((s) => s.loadMe);
	const hasAnyPermission = useAuth((s) => s.hasAnyPermission);

	useEffect(() => {
		if (!initialized) void loadMe();
	}, [initialized, loadMe]);

	const postQuery = useQuery({
		queryKey: ["post", id],
		queryFn: () => postsApi.getById(id),
		enabled: !!user,
	});

	if (!initialized) {
		return <Centered>Loading...</Centered>;
	}
	if (!user) {
		return <Centered>You must be logged in to preview.</Centered>;
	}
	if (postQuery.isLoading) {
		return <Centered>Loading post...</Centered>;
	}
	if (postQuery.isError || !postQuery.data) {
		return <Centered>Post not found or access denied.</Centered>;
	}

	const p = postQuery.data;
	const canViewAny = hasAnyPermission(["post:write:any", "post:review"]);
	const isOwner = user!.id === p.user.id;
	if (!isOwner && !canViewAny) {
		return <Centered>Access denied. You do not have permission to preview this post.</Centered>;
	}
	const date = p.publishedAt ?? p.updatedAt;

	return (
		<div className="bg-background min-h-screen">
			<div className="bg-secondary/50 border-b">
				<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-2 text-xs">
					<span className="text-muted-foreground">
						Preview mode — this is how the post will appear when published.
					</span>
					<Badge variant="secondary">{p.status}</Badge>
				</div>
			</div>

			<article className="mx-auto max-w-3xl px-6 py-12">
				{p.coverUrl && (
					<img
						src={p.coverUrl}
						alt=""
						className="mb-8 aspect-video w-full rounded-lg object-cover"
					/>
				)}

				<header className="mb-8 space-y-3">
					<div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
						<span>@{p.user.username}</span>
						<span>·</span>
						<time>{new Date(date).toLocaleDateString()}</time>
						<span>·</span>
						<span>{p.readingTime} min read</span>
					</div>
					<h1 className="text-4xl leading-tight font-bold">{p.title}</h1>
					{p.excerpt && <p className="text-muted-foreground text-lg">{p.excerpt}</p>}
					{p.tags.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{p.tags.map((t) => (
								<Badge key={t} variant="outline">
									#{t}
								</Badge>
							))}
						</div>
					)}
				</header>

				<div className="tiptap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.contentHtml) }} />
			</article>
		</div>
	);
}

function Centered({ children }: { children: React.ReactNode }) {
	return (
		<div className="text-muted-foreground flex min-h-screen items-center justify-center text-sm">
			{children}
		</div>
	);
}
