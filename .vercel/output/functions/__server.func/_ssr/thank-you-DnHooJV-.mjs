import { C as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { O as CircleCheck, d as Share2 } from "../_libs/lucide-react.mjs";
import { r as Route$6 } from "./router-CSvPMnxF.mjs";
// node_modules/.nitro/vite/services/ssr/assets/thank-you-DnHooJV-.js
var import_jsx_runtime = require_jsx_runtime();
function ThankYou() {
	const search = Route$6.useSearch();
	const market = search.market ?? "your market";
	const side = search.side ?? "yes";
	const amount = search.amount ?? "";
	const text = `I just traded ${side.toUpperCase()} on "${market}"${amount ? ` for $${amount} USDC` : ""} privately on @moxiedotmarkets.`;
	const share = encodeURIComponent(text);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "mx-auto max-w-xl py-14 space-y-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "fey-card p-6 space-y-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "inline-flex items-center gap-2 rounded-pill bg-fey-obsidian border border-fey-growth/60 px-3.5 py-1 text-caption text-fey-growth",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "TRADE SETTLED" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-display text-fey-white",
					children: ["Your trade is ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-fey-growth",
						children: "settled."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "fey-well p-4 space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-heading-sm text-fey-white",
							children: market
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "tnum text-display text-fey-ember",
							children: [side.toUpperCase(), amount ? ` · $${amount} USDC` : ""]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-body text-fey-mist",
							children: "You keep full control of your wallet. Your shares sit in the Polygon address derived automatically from your Solana key."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3 pt-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							className: "ghost-pill-cta inline-flex h-11 items-center gap-2 px-5 text-body font-medium",
							href: `https://x.com/intent/tweet?text=${share}`,
							target: "_blank",
							rel: "noreferrer",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "size-4 text-fey-signal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Share on X" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/portfolio",
							className: "inline-flex h-11 items-center rounded-pill bg-fey-obsidian border border-fey-smoke px-5 text-body font-medium text-fey-white hover:border-fey-pale",
							children: "View Portfolio"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/markets",
							className: "inline-flex h-11 items-center rounded-pill bg-fey-obsidian border border-fey-smoke px-5 text-body font-medium text-fey-mist hover:text-fey-white",
							children: "Back to Markets"
						})
					]
				})
			]
		})
	});
}
export { ThankYou as component };
