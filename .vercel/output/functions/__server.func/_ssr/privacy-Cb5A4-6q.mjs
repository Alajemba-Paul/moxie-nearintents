import { C as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
// node_modules/.nitro/vite/services/ssr/assets/privacy-Cb5A4-6q.js
var import_jsx_runtime = require_jsx_runtime();
function Privacy() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-2xl py-12 space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-caption text-fey-signal",
			children: "Privacy"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
			className: "mt-2 text-display text-fey-white",
			children: ["Your keys stay ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-fey-growth",
				children: "yours."
			})]
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "fey-card p-6 space-y-4 text-body text-fey-mist",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Moxie Markets never takes control of your USDC. Every bet starts with a Solana escrow lock that you approve. The public Solana transaction only stores the USDC amount, a hash of your order, and the expiry time—so copy-trading bots cannot see which market or side you picked." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Connecting Phantom, Solflare, Backpack, or a mobile wallet reads only your public Solana address. From that public address, Moxie derives your Polygon settlement address using NEAR Chain Signatures (",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "tnum text-fey-signal",
						children: "v1.signer-prod.testnet"
					}),
					")."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The terminal connects to Solana, NEAR, and Polygon RPC providers to read balances and submit transactions. We do not use advertising trackers or sell user data." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Contact us at ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "mailto:moxiedotmarkets@gmail.com",
						className: "text-fey-signal hover:underline",
						children: "moxiedotmarkets@gmail.com"
					}),
					" or on X at ",
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
export { Privacy as component };
