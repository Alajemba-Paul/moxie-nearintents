import { C as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
// node_modules/.nitro/vite/services/ssr/assets/terms-R8CauUgn.js
var import_jsx_runtime = require_jsx_runtime();
function Terms() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-2xl py-12 space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-caption text-fey-signal",
			children: "Legal"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
			className: "mt-2 text-display text-fey-white",
			children: ["Terms of ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-fey-ember",
				children: "use."
			})]
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "fey-card p-6 space-y-4 text-body text-fey-mist",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Moxie Markets gives you a direct web interface to lock USDC on Solana and route orders to Polymarket. You sign every transaction with your own wallet. Moxie never holds your private keys." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "When you click Lock bet, you set the market, outcome (YES or NO), USDC amount, price room (slippage percentage), and expiry time. If a solver cannot fill your order within your price room before the timer ends, you can reclaim your USDC from the Solana escrow account." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Devnet and Polygon Amoy activity uses test tokens for demonstration. Make sure your Solana wallet is set to the correct network before approving a lock." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Questions or support: ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "mailto:moxiedotmarkets@gmail.com",
						className: "text-fey-signal hover:underline",
						children: "moxiedotmarkets@gmail.com"
					}),
					" or ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "https://x.com/moxiedotmarkets",
						target: "_blank",
						rel: "noreferrer",
						className: "text-fey-signal hover:underline",
						children: "@moxiedotmarkets"
					}),
					"."
				] })
			]
		})]
	});
}
export { Terms as component };
