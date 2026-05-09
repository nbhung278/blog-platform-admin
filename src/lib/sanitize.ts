import DOMPurify from "isomorphic-dompurify";

// Keep in sync with blog-platform-frontend/src/lib/sanitize.ts — both apps
// render the same Tiptap HTML so they must allow the same tags.
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
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel", "class"];

export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
	});
}
