import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// The CSP meta tag in index.html is production-tuned (api.strix-blog.uk,
// cdn.strix-blog.uk, S3, Google avatars). In dev the admin SPA talks to
// http://localhost:3000 which would otherwise be blocked by connect-src.
// Strip the meta CSP during `vite dev` so the dev server isn't crippled;
// the meta still ships verbatim in `vite build` output for prod.
function stripCspInDev(): Plugin {
	return {
		name: "strip-csp-in-dev",
		apply: "serve",
		transformIndexHtml: {
			order: "pre",
			handler(html) {
				return html.replace(
					/<meta\s+http-equiv="Content-Security-Policy"[^>]*\/?>/i,
					"<!-- CSP meta tag stripped by vite-dev plugin; production build retains it -->",
				);
			},
		},
	};
}

export default defineConfig({
	plugins: [react(), tailwindcss(), stripCspInDev()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 5174,
	},
});
