import { o as __toESM } from "../_runtime.mjs";
import { X as require_react, Y as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { b as positionsOf, f as formatShares, j as useDesk, n as MARKETS, p as formatUsdc } from "./store-CamqHgVu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/portfolio-D1xxf84b.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Portfolio() {
	const [ready, setReady] = (0, import_react.useState)(false);
	const orders = useDesk((state) => state.orders);
	const available = useDesk((state) => state.available);
	const locked = useDesk((state) => state.locked);
	(0, import_react.useEffect)(() => {
		Promise.resolve(useDesk.persist.rehydrate()).finally(() => setReady(true));
	}, []);
	const positions = positionsOf(orders);
	const history = orders.filter((order) => order.phase === "settled" || order.phase === "refunded");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "px-4 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "kicker text-xs text-slate",
				children: "Portfolio"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 text-3xl text-platinum",
				children: "What you hold"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid gap-4 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-card bg-deep p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "kicker text-xs text-slate",
						children: "Free"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "stat mt-2 text-3xl",
						children: ready ? formatUsdc(available) : "—"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-card bg-deep p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "kicker text-xs text-slate",
						children: "Locked"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "stat mt-2 text-3xl",
						children: ready ? formatUsdc(locked) : "—"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-10 text-xl text-platinum",
				children: "Shares"
			}),
			positions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-mist",
				children: "No settled shares yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 divide-y divide-kelp border-t border-kelp",
				children: positions.map((position) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-platinum",
						children: MARKETS.find((item) => item.id === position.marketId)?.question
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs text-foam",
						children: position.side.toUpperCase()
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "stat",
						children: formatShares(position.sharesMicro)
					})]
				}, position.tokenId))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-10 text-xl text-platinum",
				children: "Intents"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-3 space-y-3",
				children: [history.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "text-mist",
					children: "Nothing settled on this device."
				}) : null, history.map((order) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-card bg-kelp p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-platinum",
							children: MARKETS.find((item) => item.id === order.intent.marketId)?.question
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-mist",
							children: [
								order.phase,
								" · ",
								order.intent.side.toUpperCase(),
								" · ",
								formatUsdc(order.intent.sizeMicro),
								" USDC"
							]
						}),
						order.polygonTxHex ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "mt-2 inline-block text-sm text-foam",
							href: `https://amoy.polygonscan.com/tx/${order.polygonTxHex.startsWith("0x") ? order.polygonTxHex : `0x${order.polygonTxHex}`}`,
							target: "_blank",
							rel: "noreferrer",
							children: "Polygonscan"
						}) : null
					]
				}, order.id))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: "mt-8 inline-flex h-11 items-center rounded-control bg-cta px-4 text-sm font-medium text-abyss",
				children: "Back to markets"
			})
		]
	});
}
//#endregion
export { Portfolio as component };
