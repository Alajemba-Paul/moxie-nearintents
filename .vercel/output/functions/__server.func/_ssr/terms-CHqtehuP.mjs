import { Y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/terms-CHqtehuP.js
var import_jsx_runtime = require_jsx_runtime();
function Terms() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "max-w-2xl px-4 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "kicker text-xs text-slate",
				children: "Terms"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 text-3xl",
				children: "Prediction protocol terms"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 space-y-4 text-mist",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Moxie is a non-custodial interface. You sign every lock. ICM Labs does not hold your tokens and does not promise that a solver will fill a bet." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "An intent is a request: market, side, size, slippage room, and expiry. A match can fail. If the fill proof does not check out, the deposit stays locked until the escrow rules allow a refund." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Devnet and Amoy activity is test traffic. Prices on the desk are a practice book unless a wallet transaction is confirmed on-chain. Settled rows are receipts, not investment advice." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "You are responsible for the wallet you connect and for setting that wallet to Devnet before you approve a lock. One escrow account can be open per Solana key." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Contact ICM Labs, FUTO, Nigeria at ops@moxie.markets or icmlabs@gmail.com." })
				]
			})
		]
	});
}
//#endregion
export { Terms as component };
