import DOMPurify from "isomorphic-dompurify";

// Sanitize HTML produced by the Tiptap editor before rendering with
// dangerouslySetInnerHTML. The allowlist must mirror every Tiptap extension
// the editor enables (StarterKit + Image + Link + Highlight + TextAlign +
// Color + Table + Youtube). When the editor gains a new node type, add the
// matching tag here AND in blog-platform-frontend/src/lib/sanitize.ts.
const ALLOWED_TAGS = [
	"p",
	"br",
	"hr",
	"h1",
	"h2",
	"h3",
	"h4",
	"strong",
	"em",
	"u",
	"s",
	"code",
	"pre",
	"blockquote",
	"ul",
	"ol",
	"li",
	"a",
	"img",
	"figure",
	"figcaption",
	"span",
	"div",
	// Table extension renders standard table markup with optional colgroup.
	"table",
	"thead",
	"tbody",
	"tfoot",
	"tr",
	"th",
	"td",
	"caption",
	"colgroup",
	"col",
	// Youtube extension renders <div data-youtube-video><iframe ...></iframe></div>.
	// The iframe src is locked to youtube/youtube-nocookie embeds by the hook
	// registered below — any other iframe is stripped.
	"iframe",
];

const ALLOWED_ATTR = [
	"href",
	"src",
	"alt",
	"title",
	"target",
	"rel",
	"class",
	// Table column sizing produced by the resizable Table extension.
	"colwidth",
	"colspan",
	"rowspan",
	// Iframe attrs needed for YouTube embeds. The src itself is validated by
	// the uponSanitizeElement hook so a non-YouTube iframe never survives.
	"allow",
	"allowfullscreen",
	"frameborder",
	"width",
	"height",
	"data-youtube-video",
];

// YouTube and youtube-nocookie embeds only. Anything else surfacing as an
// <iframe> (e.g. an attacker hand-crafting one inside contentHtml) gets
// dropped before the sanitized HTML returns.
const YOUTUBE_EMBED_RE = /^https:\/\/www\.(?:youtube|youtube-nocookie)\.com\/embed\/[\w-]+/;

let hookRegistered = false;
function ensureHook() {
	if (hookRegistered) return;
	hookRegistered = true;
	DOMPurify.addHook("uponSanitizeElement", (node, data) => {
		if (data.tagName !== "iframe") return;
		// `node` is an Element when tagName is "iframe"; getAttribute is safe.
		const src = (node as Element).getAttribute("src") || "";
		if (!YOUTUBE_EMBED_RE.test(src)) {
			(node as Element).parentNode?.removeChild(node as Element);
		}
	});
}

export function sanitizeHtml(html: string): string {
	ensureHook();
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
	});
}

// Returns the URL only if it parses to an absolute http(s) URL. Rejects
// `javascript:`, `data:`, `file:`, etc., and rejects relative paths so a
// tampered avatar / cover URL field can't render as a same-origin URL
// (which would let an attacker point an <img src> at a sensitive same-site
// page). Keep this in sync with blog-platform-frontend/src/lib/sanitize.ts.
export function safeImageUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		// No base argument — `new URL` will throw on relative inputs. That's
		// the behavior we want: external image refs only.
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
		return parsed.toString();
	} catch {
		return null;
	}
}
