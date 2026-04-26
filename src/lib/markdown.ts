import TurndownService from "turndown";

const td = new TurndownService({
	headingStyle: "atx",
	codeBlockStyle: "fenced",
	bulletListMarker: "-",
	emDelimiter: "*",
});

// Preserve fenced code blocks with language hint (Tiptap stores language in
// `class="language-xxx"` on the <code> child).
td.addRule("fencedCodeBlock", {
	filter: (node) =>
		node.nodeName === "PRE" &&
		node.firstChild !== null &&
		(node.firstChild as HTMLElement).nodeName === "CODE",
	replacement: (_content, node) => {
		const codeEl = (node as HTMLElement).firstChild as HTMLElement;
		const cls = codeEl.getAttribute("class") || "";
		const lang = cls.match(/language-(\S+)/)?.[1] || "";
		const code = codeEl.textContent || "";
		return `\n\`\`\`${lang}\n${code.replace(/\n$/, "")}\n\`\`\`\n`;
	},
});

export function htmlToMarkdown(html: string): string {
	return td.turndown(html);
}
