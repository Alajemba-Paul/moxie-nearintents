import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, J as require_react, b as Link, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as ArrowUpRight, p as Search } from "../_libs/lucide-react.mjs";
import { n as motion } from "../_libs/framer-motion+[...].mjs";
import { Y as sfx, _ as MARKET_CATEGORIES, h as MARKETS, q as complementAsk } from "./router-itBMdy9l.mjs";
// node_modules/.nitro/vite/services/ssr/assets/markets-PPMCM51k.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SPRING = {
	type: "spring",
	stiffness: 300,
	damping: 28,
	mass: .8
};
function MarketsTerminal() {
	const navigate = useNavigate();
	const [category, setCategory] = (0, import_react.useState)("All");
	const [query, setQuery] = (0, import_react.useState)("");
	const [markets, setMarkets] = (0, import_react.useState)(MARKETS);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		setLoading(true);
		const controller = new AbortController();
		async function load() {
			try {
				const params = new URLSearchParams();
				if (category !== "All") params.set("category", category);
				if (query.trim()) params.set("q", query.trim());
				const res = await fetch(`/api/polymarket/markets?${params.toString()}`, { signal: controller.signal });
				if (!res.ok) throw new Error("Failed to load markets");
				const data = await res.json();
				if (!cancelled) {
					setMarkets(data.markets);
					setLoading(false);
				}
			} catch {
				if (!cancelled) {
					const q = query.trim().toLowerCase();
					const filtered = MARKETS.filter((m) => {
						const catMatch = category === "All" || m.category === category;
						const qMatch = !q || m.question.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.venue.toLowerCase().includes(q);
						return catMatch && qMatch;
					});
					setMarkets(filtered);
					setLoading(false);
				}
			}
		}
		const debounce = setTimeout(() => {
			load();
		}, 120);
		return () => {
			cancelled = true;
			clearTimeout(debounce);
			controller.abort();
		};
	}, [category, query]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "py-10 space-y-10 w-full max-w-full overflow-x-hidden box-border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-col gap-6 md:flex-row md:items-end md:justify-between w-full max-w-full box-border",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-caption text-fey-graphite",
						children: "Market Discovery"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "mt-2 text-display-lg text-fey-white",
						children: ["Pick your market ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fey-signal",
							children: "privately."
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2.5 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 py-2.5 w-full max-w-full md:w-80 box-border overflow-hidden focus-within:border-fey-signal transition-colors",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4 text-fey-graphite shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "search",
						value: query,
						onChange: (e) => setQuery(e.target.value),
						placeholder: "Search events, topics, tickers...",
						"aria-label": "Search markets",
						className: "w-full max-w-full min-w-0 bg-transparent text-body text-fey-white outline-none placeholder:text-fey-graphite box-border"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-2 overflow-x-auto pb-2 border-b border-fey-smoke",
				role: "tablist",
				"aria-label": "Market categories",
				children: MARKET_CATEGORIES.map((cat) => {
					const active = category === cat;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						role: "tab",
						"aria-selected": active,
						onClick: () => {
							sfx.tap();
							setCategory(cat);
						},
						className: `relative rounded-pill px-4 py-2 text-body font-medium whitespace-nowrap shrink-0 transition-colors ${active ? "text-fey-white" : "text-fey-graphite hover:text-fey-mist"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: cat }), active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
							layoutId: "category-underline",
							initial: false,
							transition: SPRING,
							className: "absolute inset-x-3 -bottom-2 h-0.5 rounded-pill bg-fey-signal"
						}) : null]
					}, cat);
				})
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
				"aria-busy": "true",
				"aria-label": "Loading markets",
				children: Array.from({ length: 6 }).map((_, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "fey-card h-64 p-5 animate-pulse flex flex-col justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-28 rounded-pill bg-fey-obsidian" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-5 w-full rounded-pill bg-fey-obsidian" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-5 w-3/4 rounded-pill bg-fey-obsidian" })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-10 w-24 rounded-pill bg-fey-obsidian" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-10 rounded-pill bg-fey-obsidian" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-10 rounded-pill bg-fey-obsidian" })]
						})]
					})]
				}, idx))
			}) : markets.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fey-card p-10 text-center space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-heading-sm text-fey-white",
						children: "No markets match your filter."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-body text-fey-graphite",
						children: "Try clearing your search or switching back to All categories."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setCategory("All");
							setQuery("");
						},
						className: "ghost-pill-cta h-10 px-5 text-xs font-medium",
						children: "Reset Filters"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
				children: markets.map((market) => {
					const yesPct = Math.round(market.yesAskMicro / 1e4);
					const noMicro = complementAsk(market.yesAskMicro);
					const noPct = Math.round(noMicro / 1e4);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
						initial: false,
						transition: SPRING,
						className: "fey-card p-5 flex flex-col justify-between gap-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2 text-caption text-fey-graphite",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-fey-signal",
									children: market.category
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tnum",
									children: ["24h Vol ", market.volume]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/trade/$marketId",
								params: { marketId: market.id },
								className: "group flex items-start justify-between gap-2 text-heading-sm text-fey-white hover:text-fey-signal transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: market.question }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-4 shrink-0 text-fey-graphite group-hover:text-fey-signal transition-colors mt-1" })]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tnum text-display text-fey-white",
									children: [yesPct, "%"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-2 text-caption text-fey-growth",
									children: "YES"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs text-fey-graphite",
									children: ["Ends ", market.resolves]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2.5 flex h-1.5 w-full overflow-hidden rounded-pill bg-fey-obsidian",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
									className: "h-full bg-fey-growth",
									initial: false,
									animate: { width: `${yesPct}%` },
									transition: SPRING
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full flex-1 bg-fey-ember" })]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										sfx.tap();
										navigate({
											to: "/trade/$marketId",
											params: { marketId: market.id },
											search: { side: "yes" }
										});
									},
									className: "flex h-10 items-center justify-between rounded-pill bg-fey-obsidian border border-fey-growth/60 px-3.5 text-xs font-medium text-fey-growth hover:bg-fey-growth/15 transition-colors",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Trade YES" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tnum",
										children: [yesPct, "¢"]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										sfx.tap();
										navigate({
											to: "/trade/$marketId",
											params: { marketId: market.id },
											search: { side: "no" }
										});
									},
									className: "flex h-10 items-center justify-between rounded-pill bg-fey-obsidian border border-fey-ember/60 px-3.5 text-xs font-medium text-fey-ember hover:bg-fey-ember/15 transition-colors",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Trade NO" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tnum",
										children: [noPct, "¢"]
									})]
								})]
							})]
						})]
					}, market.id);
				})
			})
		]
	});
}
export { MarketsTerminal as component };
