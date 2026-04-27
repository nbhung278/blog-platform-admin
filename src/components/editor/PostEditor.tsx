import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
	Bold,
	Italic,
	Code,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Quote,
	Link as LinkIcon,
	Image as ImageIcon,
	Undo2,
	Redo2,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { uploadsApi } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Props = {
	value: string; // HTML
	onChange: (html: string) => void;
	placeholder?: string;
};

export function PostEditor({ value, onChange, placeholder }: Props) {
	const uploadingRef = useRef(false);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
				codeBlock: { HTMLAttributes: { class: "tiptap-code-block" } },
			}),
			Image.configure({ HTMLAttributes: { class: "tiptap-image" } }),
			Link.configure({
				openOnClick: false,
				autolink: true,
				HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
			}),
			Placeholder.configure({ placeholder: placeholder ?? "Bắt đầu viết..." }),
		],
		content: value || "",
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class:
					"tiptap prose prose-neutral dark:prose-invert max-w-none min-h-[400px] focus:outline-none",
			},
			handlePaste: (_view, event) => {
				const items = event.clipboardData?.items;
				if (!items) return false;
				for (const item of items) {
					if (item.type.startsWith("image/")) {
						const file = item.getAsFile();
						if (file) {
							event.preventDefault();
							void uploadAndInsert(file);
							return true;
						}
					}
				}
				return false;
			},
			handleDrop: (_view, event) => {
				const files = event.dataTransfer?.files;
				if (!files || files.length === 0) return false;
				const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
				if (imageFiles.length === 0) return false;
				event.preventDefault();
				for (const f of imageFiles) void uploadAndInsert(f);
				return true;
			},
		},
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
	});

	// Sync external value changes (e.g., loading existing post).
	useEffect(() => {
		if (!editor) return;
		if (editor.getHTML() !== value) {
			editor.commands.setContent(value || "", { emitUpdate: false });
		}
	}, [editor, value]);

	async function uploadAndInsert(file: File) {
		if (!editor) return;
		uploadingRef.current = true;
		const id = toast.loading(`Uploading ${file.name}...`);
		try {
			const { url } = await uploadsApi.uploadImage(file);
			editor.chain().focus().setImage({ src: url, alt: file.name }).run();
			toast.success("Image uploaded", { id });
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
				"Upload failed";
			toast.error(msg, { id });
		} finally {
			uploadingRef.current = false;
		}
	}

	function pickAndUpload() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/jpeg,image/png,image/webp,image/gif";
		input.onchange = () => {
			const file = input.files?.[0];
			if (file && mountedRef.current) void uploadAndInsert(file);
			input.onchange = null;
		};
		input.click();
	}

	function setLink() {
		if (!editor) return;
		const prev = editor.getAttributes("link").href as string | undefined;
		const url = window.prompt("URL", prev ?? "https://");
		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
		} catch {
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}

	if (!editor) return null;

	return (
		<div className="rounded-md border">
			<Toolbar
				editor={editor}
				onPickImage={pickAndUpload}
				onSetLink={setLink}
				uploadingRef={uploadingRef}
			/>
			<div className="p-4">
				<EditorContent editor={editor} />
			</div>
		</div>
	);
}

function Toolbar({
	editor,
	onPickImage,
	onSetLink,
	uploadingRef,
}: {
	editor: ReturnType<typeof useEditor>;
	onPickImage: () => void;
	onSetLink: () => void;
	uploadingRef: React.MutableRefObject<boolean>;
}) {
	if (!editor) return null;

	return (
		<div className="bg-muted/40 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
			<TbBtn
				onClick={() => editor.chain().focus().toggleBold().run()}
				active={editor.isActive("bold")}
				title="Bold (Ctrl+B)"
			>
				<Bold className="h-4 w-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleItalic().run()}
				active={editor.isActive("italic")}
				title="Italic (Ctrl+I)"
			>
				<Italic className="h-4 w-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleCode().run()}
				active={editor.isActive("code")}
				title="Inline code"
			>
				<Code className="h-4 w-4" />
			</TbBtn>

			<Sep />

			<TbBtn
				onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				active={editor.isActive("heading", { level: 1 })}
				title="Heading 1"
			>
				<Heading1 className="h-4 w-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				active={editor.isActive("heading", { level: 2 })}
				title="Heading 2"
			>
				<Heading2 className="h-4 w-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
				active={editor.isActive("heading", { level: 3 })}
				title="Heading 3"
			>
				<Heading3 className="h-4 w-4" />
			</TbBtn>

			<Sep />

			<TbBtn
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				active={editor.isActive("bulletList")}
				title="Bullet list"
			>
				<List className="h-4 w-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				active={editor.isActive("orderedList")}
				title="Numbered list"
			>
				<ListOrdered className="h-4 w-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
				active={editor.isActive("blockquote")}
				title="Quote"
			>
				<Quote className="h-4 w-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleCodeBlock().run()}
				active={editor.isActive("codeBlock")}
				title="Code block"
			>
				<Code className="h-4 w-4" />
			</TbBtn>

			<Sep />

			<TbBtn onClick={onSetLink} active={editor.isActive("link")} title="Insert link">
				<LinkIcon className="h-4 w-4" />
			</TbBtn>
			<TbBtn onClick={onPickImage} title="Upload image">
				{uploadingRef.current ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<ImageIcon className="h-4 w-4" />
				)}
			</TbBtn>

			<Sep />

			<TbBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
				<Undo2 className="h-4 w-4" />
			</TbBtn>
			<TbBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Shift+Z)">
				<Redo2 className="h-4 w-4" />
			</TbBtn>
		</div>
	);
}

function TbBtn({
	onClick,
	active,
	title,
	children,
}: {
	onClick: () => void;
	active?: boolean;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			className={cn(
				"hover:bg-accent flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
				active && "bg-accent text-accent-foreground",
			)}
		>
			{children}
		</button>
	);
}

function Sep() {
	return <div className="bg-border mx-1 h-6 w-px" />;
}
