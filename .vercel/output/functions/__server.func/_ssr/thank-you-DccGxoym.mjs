import { Y as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Route } from "./router-C2oeO81J.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/thank-you-DccGxoym.js
var import_jsx_runtime = require_jsx_runtime();
function ThankYou() {
	const { market, side, amount } = Route.useSearch();
	const text = `I just filled ${side.toUpperCase()} on “${market}”${amount ? ` for $${amount}` : ""} via Moxie.`;
	const share = encodeURIComponent(text);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "max-w-xl px-4 py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "kicker text-xs text-slate",
				children: "Settled"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 text-3xl",
				children: "The fill landed"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "mt-6 rounded-card bg-deep p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-platinum",
						children: market
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "stat mt-3 text-4xl",
						children: [side.toUpperCase(), amount ? ` · $${amount}` : ""]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm",
						children: "Non-custodial receipt. The position sits on the Polygon address derived from your Solana key."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					className: "inline-flex h-11 items-center rounded-control bg-cta px-4 text-sm font-medium text-abyss",
					href: `https://twitter.com/intent/tweet?text=${share}`,
					target: "_blank",
					rel: "noreferrer",
					children: "Share on X"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/portfolio",
					className: "inline-flex h-11 items-center rounded-control bg-kelp px-4 text-sm text-foam",
					children: "Portfolio"
				})]
			})
		]
	});
}
//#endregion
export { ThankYou as component };
