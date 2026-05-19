import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import Youtube from "@tiptap/extension-youtube";
import {
	Bold,
	Italic,
	Underline as UnderlineIcon,
	Strikethrough,
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
	AlignLeft,
	AlignCenter,
	AlignRight,
	AlignJustify,
	Highlighter,
	Minus,
	Table as TableIcon,
	Palette,
	Plus,
	Trash2,
	Rows3,
	Columns3,
	Film,
	Braces,
} from "lucide-react";
import { toast } from "sonner";
import { uploadsApi } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
	value: string;
	onChange: (html: string) => void;
	placeholder?: string;
};

const TEXT_COLORS = [
	{ name: "Default", value: "" },
	{ name: "Gray", value: "oklch(0.55 0 0)" },
	{ name: "Red", value: "oklch(0.55 0.22 27)" },
	{ name: "Orange", value: "oklch(0.65 0.18 50)" },
	{ name: "Yellow", value: "oklch(0.75 0.16 90)" },
	{ name: "Green", value: "oklch(0.55 0.18 145)" },
	{ name: "Blue", value: "oklch(0.55 0.22 250)" },
	{ name: "Purple", value: "oklch(0.55 0.22 300)" },
	{ name: "Pink", value: "oklch(0.65 0.22 350)" },
];

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
				HTMLAttributes: { rel: "nofollow noopener noreferrer sponsored", target: "_blank" },
			}),
			Placeholder.configure({ placeholder: placeholder ?? "Bắt đầu viết..." }),
			Highlight.configure({ multicolor: false }),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			TextStyle,
			Color,
			Table.configure({ resizable: true }),
			TableRow,
			TableHeader,
			TableCell,
			Youtube.configure({
				controls: true,
				nocookie: true,
				HTMLAttributes: { class: "tiptap-youtube" },
			}),
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
			if (!mountedRef.current || editor.isDestroyed) {
				toast.dismiss(id);
				return;
			}
			editor.chain().focus().setImage({ src: url, alt: file.name }).run();
			toast.success("Image uploaded", { id });
		} catch (err: unknown) {
			if (!mountedRef.current) {
				toast.dismiss(id);
				return;
			}
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

	function insertYoutube() {
		if (!editor) return;
		const url = window.prompt("YouTube URL", "https://www.youtube.com/watch?v=");
		if (!url) return;
		try {
			const parsed = new URL(url);
			const ok =
				parsed.hostname === "youtu.be" ||
				parsed.hostname === "www.youtube.com" ||
				parsed.hostname === "youtube.com" ||
				parsed.hostname === "m.youtube.com";
			if (!ok) {
				toast.error("Only YouTube URLs are supported");
				return;
			}
		} catch {
			toast.error("Invalid URL");
			return;
		}
		editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
	}

	if (!editor) return null;

	return (
		<div className="overflow-hidden rounded-md border">
			<MainToolbar
				editor={editor}
				onPickImage={pickAndUpload}
				onSetLink={setLink}
				onInsertYoutube={insertYoutube}
				uploadingRef={uploadingRef}
			/>
			<div className="p-4">
				<BubbleMenu
					editor={editor}
					className="tiptap-bubble-menu"
					shouldShow={({ editor, from, to }) => {
						if (from === to) return false;
						if (editor.isActive("image")) return false;
						return true;
					}}
				>
					<InlineFormatButtons editor={editor} onSetLink={setLink} />
				</BubbleMenu>

				<FloatingMenu
					editor={editor}
					className="tiptap-floating-menu"
					shouldShow={({ editor }) => {
						const { $from } = editor.state.selection;
						const isEmpty = $from.parent.content.size === 0;
						const isParagraph = $from.parent.type.name === "paragraph";
						return isEmpty && isParagraph;
					}}
				>
					<FloatingInsertMenu
						editor={editor}
						onPickImage={pickAndUpload}
						uploadingRef={uploadingRef}
					/>
				</FloatingMenu>

				<EditorContent editor={editor} />
			</div>
		</div>
	);
}

function MainToolbar({
	editor,
	onPickImage,
	onSetLink,
	onInsertYoutube,
	uploadingRef,
}: {
	editor: Editor;
	onPickImage: () => void;
	onSetLink: () => void;
	onInsertYoutube: () => void;
	uploadingRef: React.MutableRefObject<boolean>;
}) {
	return (
		<div className="bg-muted/40 supports-[backdrop-filter]:bg-muted/60 sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 backdrop-blur">
			<TbBtn
				onClick={() => editor.chain().focus().toggleBold().run()}
				active={editor.isActive("bold")}
				title="Bold (Ctrl+B)"
			>
				<Bold className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleItalic().run()}
				active={editor.isActive("italic")}
				title="Italic (Ctrl+I)"
			>
				<Italic className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleUnderline().run()}
				active={editor.isActive("underline")}
				title="Underline (Ctrl+U)"
			>
				<UnderlineIcon className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleStrike().run()}
				active={editor.isActive("strike")}
				title="Strikethrough"
			>
				<Strikethrough className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleCode().run()}
				active={editor.isActive("code")}
				title="Inline code"
			>
				<Code className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleHighlight().run()}
				active={editor.isActive("highlight")}
				title="Highlight"
			>
				<Highlighter className="size-4" />
			</TbBtn>
			<ColorPicker editor={editor} />

			<Sep />

			<TbBtn
				onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				active={editor.isActive("heading", { level: 1 })}
				title="Heading 1"
			>
				<Heading1 className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				active={editor.isActive("heading", { level: 2 })}
				title="Heading 2"
			>
				<Heading2 className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
				active={editor.isActive("heading", { level: 3 })}
				title="Heading 3"
			>
				<Heading3 className="size-4" />
			</TbBtn>

			<Sep />

			<TbBtn
				onClick={() => editor.chain().focus().setTextAlign("left").run()}
				active={editor.isActive({ textAlign: "left" })}
				title="Align left"
			>
				<AlignLeft className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().setTextAlign("center").run()}
				active={editor.isActive({ textAlign: "center" })}
				title="Align center"
			>
				<AlignCenter className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().setTextAlign("right").run()}
				active={editor.isActive({ textAlign: "right" })}
				title="Align right"
			>
				<AlignRight className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().setTextAlign("justify").run()}
				active={editor.isActive({ textAlign: "justify" })}
				title="Justify"
			>
				<AlignJustify className="size-4" />
			</TbBtn>

			<Sep />

			<TbBtn
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				active={editor.isActive("bulletList")}
				title="Bullet list"
			>
				<List className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				active={editor.isActive("orderedList")}
				title="Numbered list"
			>
				<ListOrdered className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
				active={editor.isActive("blockquote")}
				title="Quote"
			>
				<Quote className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleCodeBlock().run()}
				active={editor.isActive("codeBlock")}
				title="Code block"
			>
				<Code className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().setHorizontalRule().run()}
				title="Horizontal rule"
			>
				<Minus className="size-4" />
			</TbBtn>

			<Sep />

			<TbBtn onClick={onSetLink} active={editor.isActive("link")} title="Insert link">
				<LinkIcon className="size-4" />
			</TbBtn>
			<TbBtn onClick={onPickImage} title="Upload image">
				{uploadingRef.current ? (
					<Loader2 className="size-4 animate-spin" />
				) : (
					<ImageIcon className="size-4" />
				)}
			</TbBtn>
			<TbBtn onClick={onInsertYoutube} title="Embed YouTube video">
				<Film className="size-4" />
			</TbBtn>
			<InsertHtmlButton editor={editor} />
			<TableMenu editor={editor} />

			<Sep />

			<TbBtn
				onClick={() => editor.chain().focus().undo().run()}
				disabled={!editor.can().undo()}
				title="Undo (Ctrl+Z)"
			>
				<Undo2 className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().redo().run()}
				disabled={!editor.can().redo()}
				title="Redo (Ctrl+Shift+Z)"
			>
				<Redo2 className="size-4" />
			</TbBtn>
		</div>
	);
}

function InlineFormatButtons({ editor, onSetLink }: { editor: Editor; onSetLink: () => void }) {
	return (
		<>
			<TbBtn
				onClick={() => editor.chain().focus().toggleBold().run()}
				active={editor.isActive("bold")}
				title="Bold"
			>
				<Bold className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleItalic().run()}
				active={editor.isActive("italic")}
				title="Italic"
			>
				<Italic className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleUnderline().run()}
				active={editor.isActive("underline")}
				title="Underline"
			>
				<UnderlineIcon className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleStrike().run()}
				active={editor.isActive("strike")}
				title="Strikethrough"
			>
				<Strikethrough className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleHighlight().run()}
				active={editor.isActive("highlight")}
				title="Highlight"
			>
				<Highlighter className="size-4" />
			</TbBtn>
			<TbBtn onClick={onSetLink} active={editor.isActive("link")} title="Link">
				<LinkIcon className="size-4" />
			</TbBtn>
			<Sep />
			<TbBtn
				onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				active={editor.isActive("heading", { level: 1 })}
				title="Heading 1"
			>
				<Heading1 className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				active={editor.isActive("heading", { level: 2 })}
				title="Heading 2"
			>
				<Heading2 className="size-4" />
			</TbBtn>
			<TbBtn
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
				active={editor.isActive("blockquote")}
				title="Quote"
			>
				<Quote className="size-4" />
			</TbBtn>
		</>
	);
}

function FloatingInsertMenu({
	editor,
	onPickImage,
	uploadingRef,
}: {
	editor: Editor;
	onPickImage: () => void;
	uploadingRef: React.MutableRefObject<boolean>;
}) {
	const [open, setOpen] = useState(false);

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				title="Insert"
				className="hover:bg-accent flex size-8 items-center justify-center rounded-full border transition-colors"
			>
				<Plus className={cn("size-4 transition-transform", open && "rotate-45")} />
			</button>
			{open && (
				<div className="bg-popover text-popover-foreground absolute top-0 left-10 z-30 flex items-center gap-0.5 rounded-md border p-1 shadow-lg">
					<TbBtn
						onClick={() => {
							editor.chain().focus().toggleHeading({ level: 1 }).run();
							setOpen(false);
						}}
						title="Heading 1"
					>
						<Heading1 className="size-4" />
					</TbBtn>
					<TbBtn
						onClick={() => {
							editor.chain().focus().toggleHeading({ level: 2 }).run();
							setOpen(false);
						}}
						title="Heading 2"
					>
						<Heading2 className="size-4" />
					</TbBtn>
					<TbBtn
						onClick={() => {
							editor.chain().focus().toggleBulletList().run();
							setOpen(false);
						}}
						title="Bullet list"
					>
						<List className="size-4" />
					</TbBtn>
					<TbBtn
						onClick={() => {
							editor.chain().focus().toggleBlockquote().run();
							setOpen(false);
						}}
						title="Quote"
					>
						<Quote className="size-4" />
					</TbBtn>
					<TbBtn
						onClick={() => {
							editor.chain().focus().toggleCodeBlock().run();
							setOpen(false);
						}}
						title="Code block"
					>
						<Code className="size-4" />
					</TbBtn>
					<TbBtn
						onClick={() => {
							editor.chain().focus().setHorizontalRule().run();
							setOpen(false);
						}}
						title="Horizontal rule"
					>
						<Minus className="size-4" />
					</TbBtn>
					<TbBtn
						onClick={() => {
							onPickImage();
							setOpen(false);
						}}
						title="Image"
					>
						{uploadingRef.current ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<ImageIcon className="size-4" />
						)}
					</TbBtn>
					<TbBtn
						onClick={() => {
							editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
							setOpen(false);
						}}
						title="Table"
					>
						<TableIcon className="size-4" />
					</TbBtn>
				</div>
			)}
		</div>
	);
}

function ColorPicker({ editor }: { editor: Editor }) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) return;
		const close = () => setOpen(false);
		window.addEventListener("click", close);
		return () => window.removeEventListener("click", close);
	}, [open]);

	return (
		<div className="relative">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setOpen((o) => !o);
				}}
				title="Text color"
				className="hover:bg-accent flex size-8 items-center justify-center rounded-md text-sm transition-colors"
			>
				<Palette className="size-4" />
			</button>
			{open && (
				<div
					onClick={(e) => e.stopPropagation()}
					className="bg-popover text-popover-foreground absolute top-9 left-0 z-30 grid grid-cols-3 gap-1 rounded-md border p-2 shadow-lg"
				>
					{TEXT_COLORS.map((c) => (
						<button
							key={c.name}
							type="button"
							title={c.name}
							onClick={() => {
								if (c.value === "") {
									editor.chain().focus().unsetColor().run();
								} else {
									editor.chain().focus().setColor(c.value).run();
								}
								setOpen(false);
							}}
							className="hover:ring-ring flex size-7 items-center justify-center rounded-md border text-xs hover:ring-2"
							style={{ background: c.value || "transparent" }}
						>
							{c.value === "" && <span className="text-muted-foreground">A</span>}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function TableMenu({ editor }: { editor: Editor }) {
	const [open, setOpen] = useState(false);
	const inTable = editor.isActive("table");

	useEffect(() => {
		if (!open) return;
		const close = () => setOpen(false);
		window.addEventListener("click", close);
		return () => window.removeEventListener("click", close);
	}, [open]);

	return (
		<div className="relative">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setOpen((o) => !o);
				}}
				title="Table"
				className={cn(
					"hover:bg-accent flex size-8 items-center justify-center rounded-md text-sm transition-colors",
					inTable && "bg-accent text-accent-foreground",
				)}
			>
				<TableIcon className="size-4" />
			</button>
			{open && (
				<div
					onClick={(e) => e.stopPropagation()}
					className="bg-popover text-popover-foreground absolute top-9 left-0 z-30 flex flex-col gap-0.5 rounded-md border p-1 shadow-lg"
				>
					{!inTable && (
						<MenuItem
							onClick={() => {
								editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
								setOpen(false);
							}}
							icon={<Plus className="size-4" />}
							label="Insert 3×3 table"
						/>
					)}
					{inTable && (
						<>
							<MenuItem
								onClick={() => editor.chain().focus().addRowAfter().run()}
								icon={<Rows3 className="size-4" />}
								label="Add row below"
							/>
							<MenuItem
								onClick={() => editor.chain().focus().addColumnAfter().run()}
								icon={<Columns3 className="size-4" />}
								label="Add column right"
							/>
							<MenuItem
								onClick={() => editor.chain().focus().deleteRow().run()}
								icon={<Trash2 className="size-4" />}
								label="Delete row"
							/>
							<MenuItem
								onClick={() => editor.chain().focus().deleteColumn().run()}
								icon={<Trash2 className="size-4" />}
								label="Delete column"
							/>
							<MenuItem
								onClick={() => {
									editor.chain().focus().deleteTable().run();
									setOpen(false);
								}}
								icon={<Trash2 className="size-4" />}
								label="Delete table"
								destructive
							/>
						</>
					)}
				</div>
			)}
		</div>
	);
}

function MenuItem({
	onClick,
	icon,
	label,
	destructive,
}: {
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
	destructive?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
				destructive && "text-destructive",
			)}
		>
			{icon}
			<span className="whitespace-nowrap">{label}</span>
		</button>
	);
}

function TbBtn({
	onClick,
	active,
	disabled,
	title,
	children,
}: {
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			className={cn(
				"hover:bg-accent flex size-8 items-center justify-center rounded-md text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
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

function InsertHtmlButton({ editor }: { editor: Editor }) {
	const [open, setOpen] = useState(false);
	const [raw, setRaw] = useState("");

	function handleInsert() {
		if (!raw.trim()) return;
		const clean = sanitizeHtml(raw);
		editor.chain().focus().insertContent(clean).run();
		setRaw("");
		setOpen(false);
	}

	return (
		<>
			<TbBtn onClick={() => setOpen(true)} title="Insert HTML">
				<Braces className="size-4" />
			</TbBtn>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Insert HTML</DialogTitle>
					</DialogHeader>
					<Textarea
						value={raw}
						onChange={(e) => setRaw(e.target.value)}
						placeholder="Paste your HTML here..."
						className="font-mono text-sm"
						rows={8}
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleInsert} disabled={!raw.trim()}>
							Insert
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
