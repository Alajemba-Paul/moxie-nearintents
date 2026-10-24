import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, J as require_react, b as Link, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { N as ArrowRight, b as Lock, n as Wallet, u as ShieldCheck } from "../_libs/lucide-react.mjs";
import { n as motion } from "../_libs/framer-motion+[...].mjs";
import { F as formatCents, Y as sfx, h as MARKETS, q as complementAsk } from "./router-itBMdy9l.mjs";
// node_modules/.nitro/vite/services/ssr/assets/routes-ByEjBTGl.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FEATURES = [
	{
		step: "01",
		title: "Sign up / Log in",
		body: "Connect your Solana wallet or sign in with Google, X, or Email. Moxie Markets derives your Polygon address automatically.",
		icon: Wallet
	},
	{
		step: "02",
		title: "Fund your wallet",
		body: "Deposit USDC on Solana in one click.",
		icon: Lock
	},
	{
		step: "03",
		title: "Private Routing via NEAR",
		body: "Your trade routes privately through Aurora Intents Connect and NEAR Intents so bots cannot copy or front-run your order.",
		icon: ShieldCheck
	}
];
function LandingPage() {
	const navigate = useNavigate();
	const [showcaseIndex, setShowcaseIndex] = (0, import_react.useState)(0);
	const showcaseMarket = MARKETS[showcaseIndex] ?? MARKETS[0];
	const yesPct = Math.round(showcaseMarket.yesAskMicro / 1e4);
	const noMicro = complementAsk(showcaseMarket.yesAskMicro);
	const noPct = Math.round(noMicro / 1e4);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "py-12 sm:py-16 space-y-16",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "text-display-lg text-fey-white",
							children: ["Trade on global events ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fey-ember",
								children: "privately."
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "max-w-xl text-heading-sm font-normal text-fey-mist",
							children: "Trade live Polymarket outcomes privately on Solana in one click."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap items-center gap-3 pt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/markets",
								onClick: () => sfx.tap(),
								className: "ghost-pill-cta inline-flex items-center gap-3 px-8 py-4 text-lg font-medium",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Open Terminal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-5 text-fey-ember" })]
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: false,
					animate: {
						opacity: 1,
						y: 0
					},
					transition: {
						type: "spring",
						stiffness: 300,
						damping: 28,
						mass: .8
					},
					className: "fey-card p-5 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2 pb-3 border-b border-fey-smoke",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-caption text-fey-signal",
										children: showcaseMarket.category
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-fey-graphite",
										children: "·"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-caption text-fey-graphite",
										children: showcaseMarket.venue
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-1",
								children: MARKETS.slice(0, 3).map((m, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										sfx.tap();
										setShowcaseIndex(idx);
									},
									className: `h-6 rounded-pill px-2.5 text-[11px] font-medium transition-colors ${showcaseIndex === idx ? "bg-fey-obsidian border border-fey-signal text-fey-white" : "text-fey-graphite hover:text-fey-mist"}`,
									children: ["#", idx + 1]
								}, m.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-heading text-fey-white",
								children: showcaseMarket.question
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right shrink-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tnum text-display text-fey-growth",
									children: [yesPct, "%"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-caption text-fey-graphite",
									children: "YES CHANCE"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "fey-well p-3.5 space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between text-caption text-fey-graphite",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Live Orderbook Depth" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tnum",
										children: ["24h Vol ", showcaseMarket.volume]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "h-2.5 w-full overflow-hidden rounded-pill bg-fey-charcoal flex",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
										className: "h-full bg-fey-growth",
										initial: false,
										animate: { width: `${yesPct}%` },
										transition: {
											type: "spring",
											stiffness: 300,
											damping: 28,
											mass: .8
										}
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full flex-1 bg-fey-ember" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-2 pt-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => void navigate({
											to: "/trade/$marketId",
											params: { marketId: showcaseMarket.id },
											search: { side: "yes" }
										}),
										className: "flex items-center justify-between rounded-pill bg-fey-charcoal border border-fey-growth/50 px-3.5 py-2 text-xs font-medium text-fey-white hover:border-fey-growth transition-colors",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-fey-growth",
											children: "Trade YES"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "tnum",
											children: [formatCents(showcaseMarket.yesAskMicro), "¢"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => void navigate({
											to: "/trade/$marketId",
											params: { marketId: showcaseMarket.id },
											search: { side: "no" }
										}),
										className: "flex items-center justify-between rounded-pill bg-fey-charcoal border border-fey-ember/50 px-3.5 py-2 text-xs font-medium text-fey-white hover:border-fey-ember transition-colors",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-fey-ember",
											children: "Trade NO"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "tnum",
											children: [noPct, ".0¢"]
										})]
									})]
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col sm:flex-row sm:items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-caption text-fey-graphite",
						children: "How Moxie Markets Works"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "mt-1 text-display text-fey-white",
						children: ["One click from Solana to ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fey-signal",
							children: "Polymarket."
						})]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/markets",
						className: "text-body font-medium text-fey-signal hover:underline inline-flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Browse all live markets" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-5 md:grid-cols-3",
					children: FEATURES.map((feat) => {
						const Icon = feat.icon;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", {
							className: "fey-card p-5 flex flex-col justify-between gap-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "inline-flex size-9 items-center justify-center rounded-icon bg-fey-obsidian border border-fey-smoke text-fey-signal",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "tnum text-caption text-fey-graphite",
											children: feat.step
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-heading-sm text-fey-white",
										children: feat.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-body text-fey-mist",
										children: feat.body
									})
								]
							})
						}, feat.title);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-caption text-fey-graphite",
						children: "Live Orderbooks"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "mt-1 text-heading-lg text-fey-white",
						children: ["Top active markets right ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fey-ember",
							children: "now."
						})]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/markets",
						className: "ghost-pill-cta inline-flex h-10 items-center gap-2 px-4 text-xs font-medium",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Open Full Discovery" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-3.5" })]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-5 md:grid-cols-3",
					children: MARKETS.slice(0, 3).map((market) => {
						const yes = Math.round(market.yesAskMicro / 1e4);
						const no = 100 - yes;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "fey-card p-5 flex flex-col justify-between gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-caption text-fey-graphite",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-fey-signal",
									children: market.category
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tnum",
									children: ["24h ", market.volume]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/trade/$marketId",
								params: { marketId: market.id },
								className: "mt-2.5 block text-heading-sm text-fey-white hover:text-fey-signal transition-colors",
								children: market.question
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-baseline justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tnum text-display text-fey-white",
										children: [yes, "%"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs text-fey-graphite",
										children: ["Resolves ", market.resolves]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/trade/$marketId",
										params: { marketId: market.id },
										search: { side: "yes" },
										className: "flex h-10 items-center justify-between rounded-pill bg-fey-obsidian border border-fey-growth/60 px-3.5 text-xs font-medium text-fey-growth hover:bg-fey-growth/10 transition-colors",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Trade YES" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "tnum",
											children: [yes, "¢"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/trade/$marketId",
										params: { marketId: market.id },
										search: { side: "no" },
										className: "flex h-10 items-center justify-between rounded-pill bg-fey-obsidian border border-fey-ember/60 px-3.5 text-xs font-medium text-fey-ember hover:bg-fey-ember/10 transition-colors",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Trade NO" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "tnum",
											children: [no, "¢"]
										})]
									})]
								})]
							})]
						}, market.id);
					})
				})]
			})
		]
	});
}
export { LandingPage as component };
