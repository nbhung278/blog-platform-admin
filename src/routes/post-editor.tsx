import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { ArrowLeft, Eye, Save, Send, Upload, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostEditor } from "@/components/editor/PostEditor";
import { postsApi, uploadsApi, type PostStatus } from "@/lib/queries";
import { htmlToMarkdown } from "@/lib/markdown";
import { PERMISSIONS, POST_WRITE_PERMISSIONS } from "@/lib/permissions";
import { useAuth } from "@/store/auth";

// API errors come in two shapes: plain string ({ error: "Forbidden" }) or
// Zod's ZodError object ({ error: { name, issues: [{ path, message }] } }).
function formatApiError(err: unknown): string | null {
	if (!err) return null;
	if (typeof err === "string") return err;
	if (typeof err === "object" && err !== null) {
		const e = err as { issues?: { path?: (string | number)[]; message?: string }[] };
		if (Array.isArray(e.issues) && e.issues.length > 0) {
			return e.issues
				.map((i) => `${(i.path ?? []).join(".") || "field"}: ${i.message ?? "invalid"}`)
				.join("; ");
		}
	}
	return "Validation failed";
}

export function PostNewPage() {
	return (
		<AppLayout>
			<EditorScreen mode="new" />
			<Toaster richColors position="top-right" />
		</AppLayout>
	);
}

export function PostEditPage() {
	const { id } = useParams({ from: "/posts/$id/edit" });
	return (
		<AppLayout>
			<EditorScreen mode="edit" postId={id} />
			<Toaster richColors position="top-right" />
		</AppLayout>
	);
}

function EditorScreen({ mode, postId }: { mode: "new" | "edit"; postId?: string }) {
	const me = useAuth((s) => s.user)!;
	const navigate = useNavigate();
	const qc = useQueryClient();

	const canWrite = POST_WRITE_PERMISSIONS.some((p) => me.permissions.includes(p));
	const canPublish = me.permissions.includes(PERMISSIONS.POST_PUBLISH_ANY);

	const postQuery = useQuery({
		queryKey: ["post", postId],
		queryFn: () => postsApi.getById(postId!),
		enabled: mode === "edit" && !!postId,
	});

	const [title, setTitle] = useState("");
	const [excerpt, setExcerpt] = useState("");
	const [coverUrl, setCoverUrl] = useState("");
	const [tagsInput, setTagsInput] = useState("");
	const [contentHtml, setContentHtml] = useState("");
	const [status, setStatus] = useState<PostStatus>("draft");
	const [version, setVersion] = useState<number>(1);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			const { url } = await uploadsApi.uploadImage(file);
			setCoverUrl(url);
		} catch {
			toast.error("Image upload failed");
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	useEffect(() => {
		if (mode === "edit" && postQuery.data) {
			const p = postQuery.data;
			setTitle(p.title);
			setExcerpt(p.excerpt ?? "");
			setCoverUrl(p.coverUrl ?? "");
			setTagsInput(p.tags.join(", "));
			setContentHtml(p.contentHtml);
			setStatus(p.status);
			setVersion(p.version);
		}
	}, [mode, postQuery.data]);

	const saveMut = useMutation({
		mutationFn: async (nextStatus: PostStatus) => {
			const payload = {
				title: title.trim(),
				contentHtml,
				contentMd: htmlToMarkdown(contentHtml),
				excerpt: excerpt.trim() || undefined,
				coverUrl: coverUrl.trim() || null,
				status: nextStatus,
				tags: tagsInput
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean),
			};
			if (mode === "new") {
				return postsApi.create(payload);
			}
			return postsApi.update(postId!, { ...payload, version });
		},
		onSuccess: (saved) => {
			toast.success(mode === "new" ? "Post created" : "Post saved");
			qc.invalidateQueries({ queryKey: ["posts"] });
			qc.invalidateQueries({ queryKey: ["post", saved.id] });
			if (mode === "new") {
				navigate({ to: "/posts/$id/edit", params: { id: saved.id } });
			} else {
				setVersion(saved.version);
				setStatus(saved.status);
			}
		},
		onError: (err: { response?: { data?: { error?: unknown }; status?: number } }) => {
			if (err.response?.status === 409) {
				toast.error("Conflict: post was modified elsewhere. Reload to get latest.");
				return;
			}
			toast.error(formatApiError(err.response?.data?.error) ?? "Save failed");
		},
	});

	if (!canWrite) {
		return (
			<div className="text-muted-foreground text-sm">You don't have permission to write posts.</div>
		);
	}

	if (mode === "edit" && postQuery.isLoading) {
		return <div className="text-muted-foreground text-sm">Loading...</div>;
	}

	if (mode === "edit" && postQuery.isError) {
		return <div className="text-destructive text-sm">Failed to load post.</div>;
	}

	const isOwner = mode === "new" || postQuery.data?.user.id === me.id;
	const canEditThisPost = isOwner || me.permissions.includes(PERMISSIONS.POST_WRITE_ANY);

	const titleInvalid = title.trim().length === 0;
	const submitting = saveMut.isPending;

	function onSave() {
		// Saving without changing publication state.
		saveMut.mutate(status === "published" ? "published" : "draft");
	}

	function onSubmitForReview() {
		saveMut.mutate("pending");
	}

	function onPublish() {
		saveMut.mutate("published");
	}

	function onReject() {
		saveMut.mutate("rejected");
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={() => navigate({ to: "/posts" })}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-2xl font-semibold">{mode === "new" ? "New post" : "Edit post"}</h1>
						{mode === "edit" && (
							<p className="text-muted-foreground text-sm">
								Status: <Badge variant="secondary">{status}</Badge>
								{postQuery.data?.user && (
									<span className="ml-2">by @{postQuery.data.user.username}</span>
								)}
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2">
					{mode === "edit" && (
						<Button
							variant="outline"
							onClick={() =>
								window.open(`/posts/${postId}/preview`, "_blank", "noopener,noreferrer")
							}
						>
							<Eye className="h-4 w-4" />
							Preview
						</Button>
					)}

					<Button
						variant="outline"
						onClick={onSave}
						disabled={submitting || titleInvalid || !canEditThisPost}
					>
						<Save className="h-4 w-4" />
						Save draft
					</Button>

					{!canPublish && (
						<Button
							onClick={onSubmitForReview}
							disabled={submitting || titleInvalid || !canEditThisPost}
						>
							<Send className="h-4 w-4" />
							Submit for review
						</Button>
					)}

					{canPublish && (
						<>
							{status === "pending" && (
								<Button variant="destructive" onClick={onReject} disabled={submitting}>
									Reject
								</Button>
							)}
							<Button onClick={onPublish} disabled={submitting || titleInvalid || !canEditThisPost}>
								<Send className="h-4 w-4" />
								{status === "published" ? "Update published" : "Publish"}
							</Button>
						</>
					)}
				</div>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<div className="col-span-2 space-y-4">
					<Card>
						<CardContent className="pt-6">
							<div className="space-y-1.5">
								<Label htmlFor="title">Title</Label>
								<Input
									id="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="An interesting headline"
									className="text-lg"
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-6">
							<PostEditor value={contentHtml} onChange={setContentHtml} />
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Metadata</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="excerpt">Excerpt</Label>
								<textarea
									id="excerpt"
									value={excerpt}
									onChange={(e) => setExcerpt(e.target.value)}
									rows={3}
									className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
									placeholder="Short summary shown in feed"
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Cover image</Label>
								{coverUrl && (
									<div className="relative">
										<img
											src={coverUrl}
											alt="Cover preview"
											className="aspect-video w-full rounded object-cover"
										/>
										<button
											type="button"
											onClick={() => setCoverUrl("")}
											className="absolute top-1 right-1 rounded bg-black/50 p-1 text-white hover:bg-black/70"
										>
											<X className="h-3 w-3" />
										</button>
									</div>
								)}
								<div className="flex gap-2">
									<Input
										value={coverUrl}
										onChange={(e) => setCoverUrl(e.target.value)}
										placeholder="https://..."
										className="flex-1"
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={uploading}
										onClick={() => fileInputRef.current?.click()}
									>
										<Upload className="h-4 w-4" />
										{uploading ? "Uploading…" : "Upload"}
									</Button>
								</div>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									className="hidden"
									onChange={handleCoverFileChange}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="tags">Tags (comma-separated)</Label>
								<Input
									id="tags"
									value={tagsInput}
									onChange={(e) => setTagsInput(e.target.value)}
									placeholder="rust, databases"
								/>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
