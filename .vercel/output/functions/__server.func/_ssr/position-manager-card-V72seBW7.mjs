import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, J as require_react, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as ChevronDown, a as TrendingDown, h as Plus, k as ChevronUp, l as SlidersHorizontal } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as formatUsdc, E as parseUsdc, S as formatShares, Y as sfx, m as sharesFor, s as useDesk, w as markValue, x as formatCents, y as MAX_TICKET } from "./router-CSvPMnxF.mjs";
// node_modules/.nitro/vite/services/ssr/assets/position-manager-card-V72seBW7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function PositionManagerCard({ item, showMarketLink = true, defaultOpen = false }) {
	const defaultCents = formatCents(item.liveMarkPriceMicro);
	const [open, setOpen] = (0, import_react.useState)(defaultOpen);
	const [actionMode, setActionMode] = (0, import_react.useState)("buy");
	const [orderType, setOrderType] = (0, import_react.useState)("market");
	const [limitPriceCents, setLimitPriceCents] = (0, import_react.useState)(defaultCents);
	const [buyUsdcInput, setBuyUsdcInput] = (0, import_react.useState)("25");
	const [buyBalancePct, setBuyBalancePct] = (0, import_react.useState)(null);
	const [sellPct, setSellPct] = (0, import_react.useState)(100);
	const [customSellPctInput, setCustomSellPctInput] = (0, import_react.useState)("100");
	const connected = useDesk((s) => s.connected);
	const available = useDesk((s) => s.available);
	const addToPosition = useDesk((s) => s.addToPosition);
	const cashOutPosition = useDesk((s) => s.cashOutPosition);
	const pushConsoleLog = useDesk((s) => s.pushConsoleLog);
	const positive = item.pnlMicro >= 0;
	const avgEntryCents = item.sharesMicro > 0 ? (item.costMicro / item.sharesMicro * 100).toFixed(1) : "0.0";
	const executionPriceMicro = orderType === "limit" ? Math.round(Math.max(1, Math.min(99, Number.parseFloat(limitPriceCents) || 50)) * 1e4) : item.liveMarkPriceMicro;
	const parsedBuyMicro = parseUsdc(buyUsdcInput) ?? 0;
	const estAddedSharesMicro = parsedBuyMicro > 0 ? sharesFor(parsedBuyMicro, Math.max(1e4, executionPriceMicro)) : 0;
	const parsedCustomSellPct = Number.parseFloat(customSellPctInput);
	const effectiveSellPct = Number.isFinite(parsedCustomSellPct) ? Math.max(1, Math.min(100, parsedCustomSellPct)) : sellPct;
	const sharesToSellMicro = Math.min(item.sharesMicro, Math.max(1, Math.round(item.sharesMicro * effectiveSellPct / 100)));
	const estProceedsMicro = markValue(sharesToSellMicro, executionPriceMicro);
	function handleSelectBuyPct(pct) {
		sfx.tap();
		setBuyBalancePct(pct);
		const targetMicro = Math.floor(Math.min(MAX_TICKET, Math.max(0, available)) * pct / 100);
		const dollars = Math.max(.01, targetMicro / 1e6);
		setBuyUsdcInput(dollars >= 1 ? String(Math.floor(dollars)) : dollars.toFixed(2));
	}
	function handleExecuteBuy() {
		if (!connected) {
			sfx.nope();
			toast("Log in or connect your wallet in the top header first.");
			return;
		}
		const usdcMicro = parseUsdc(buyUsdcInput);
		if (usdcMicro === null || usdcMicro <= 0) {
			sfx.nope();
			toast("Enter a valid USDC amount between $0.01 and $5,000.00.");
			return;
		}
		if (usdcMicro > available) {
			sfx.nope();
			toast(`Order exceeds your Available Balance ($${formatUsdc(available)} USDC).`);
			return;
		}
		if (orderType === "limit") {
			const parsedLimit = Number.parseFloat(limitPriceCents);
			if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 99) {
				sfx.nope();
				toast("Enter a valid limit price between 1¢ and 99¢.");
				return;
			}
		}
		try {
			const { addedSharesMicro } = addToPosition({
				marketId: item.marketId,
				side: item.side,
				tokenId: item.tokenId,
				usdcMicro,
				executionPriceMicro,
				orderType
			});
			sfx.bought();
			pushConsoleLog(`[buy:${orderType}] added +${formatShares(addedSharesMicro)} ${item.side.toUpperCase()} shares on "${item.market.question}" for $${formatUsdc(usdcMicro)} USDC`);
			toast(`${orderType === "limit" ? `Limit buy (${limitPriceCents}¢)` : "Market buy"} filled: Added ${formatShares(addedSharesMicro)} ${item.side.toUpperCase()} shares ($${formatUsdc(usdcMicro)} USDC).`);
		} catch (err) {
			sfx.nope();
			toast(err instanceof Error ? err.message : "Could not add to position.");
		}
	}
	function handleExecuteSell() {
		if (!connected) {
			sfx.nope();
			toast("Log in or connect your wallet in the top header first.");
			return;
		}
		if (item.sharesMicro <= 0) {
			sfx.nope();
			toast("No shares available to sell in this position.");
			return;
		}
		const rawPct = Number.parseFloat(customSellPctInput);
		if (!Number.isFinite(rawPct) || rawPct <= 0 || rawPct > 100) {
			sfx.nope();
			toast(`Enter a sell percentage between 1% and 100%. You hold ${formatShares(item.sharesMicro)} shares.`);
			return;
		}
		if (sharesToSellMicro > item.sharesMicro) {
			sfx.nope();
			toast(`Cannot sell more than your ${formatShares(item.sharesMicro)} held shares.`);
			return;
		}
		if (orderType === "limit") {
			const parsedLimit = Number.parseFloat(limitPriceCents);
			if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 99) {
				sfx.nope();
				toast("Enter a valid limit price between 1¢ and 99¢.");
				return;
			}
		}
		sfx.bought();
		cashOutPosition(item.tokenId, estProceedsMicro, effectiveSellPct);
		pushConsoleLog(`[sell:${orderType}] sold ${effectiveSellPct}% of "${item.market.question}" for +$${formatUsdc(estProceedsMicro)} USDC`);
		toast(`${orderType === "limit" ? `Limit sell (${limitPriceCents}¢)` : "Market sell"} filled: Sold ${effectiveSellPct}% (${formatShares(sharesToSellMicro)} shares) for $${formatUsdc(estProceedsMicro)} USDC.`);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "fey-card p-5 sm:p-6 space-y-4 w-full max-w-full box-border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `inline-block rounded-pill px-3 py-0.5 text-caption ${item.side === "yes" ? "bg-fey-growth/15 text-fey-growth border border-fey-growth/50" : "bg-fey-ember/15 text-fey-ember border border-fey-ember/50"}`,
							children: [item.side.toUpperCase(), " POSITION"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-caption text-fey-graphite",
							children: item.market.venue
						})]
					}), showMarketLink ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/trade/$marketId",
						params: { marketId: item.market.id },
						className: "mt-2 block text-heading-sm sm:text-heading text-fey-white hover:text-fey-signal transition-colors",
						children: item.market.question
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mt-2 text-heading-sm sm:text-heading text-fey-white",
						children: item.market.question
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-right shrink-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-caption text-fey-graphite block",
							children: "Position Value"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tnum text-heading text-fey-white",
							children: ["$", formatUsdc(item.currentValueMicro)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `block tnum text-xs font-medium ${positive ? "text-fey-growth" : "text-fey-ember"}`,
							children: [
								positive ? "+" : "",
								"$",
								formatUsdc(item.pnlMicro),
								" (",
								positive ? "+" : "",
								item.pnlPct,
								"%)"
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "fey-well p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-caption text-fey-graphite block",
							children: "Shares"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tnum mt-1 block text-body font-semibold text-fey-white",
							children: formatShares(item.sharesMicro)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "fey-well p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-caption text-fey-graphite block",
							children: "Entry Price"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tnum mt-1 block text-body font-semibold text-fey-mist",
							children: [avgEntryCents, "¢"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "fey-well p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-caption text-fey-graphite block",
							children: "Mark Price"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tnum mt-1 block text-body font-semibold text-fey-signal",
							children: [defaultCents, "¢"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "fey-well p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-caption text-fey-graphite block",
							children: "Current PnL"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `tnum mt-1 block text-body font-semibold ${positive ? "text-fey-growth" : "text-fey-ember"}`,
							children: [
								positive ? "+" : "",
								"$",
								formatUsdc(item.pnlMicro)
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-fey-smoke text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-fey-mist font-medium inline-flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { className: "size-3.5 text-fey-signal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Position Management (Buy / Sell)" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-expanded": open,
					onClick: () => {
						sfx.tap();
						setOpen((v) => !v);
					},
					className: "inline-flex items-center gap-1.5 rounded-pill bg-fey-obsidian border border-fey-smoke px-3.5 py-1.5 text-xs font-medium text-fey-white hover:border-fey-pale transition-colors",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: open ? "Hide Controls" : "Manage Position" }), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3.5" })]
				})]
			}),
			open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fey-well p-4 sm:p-5 space-y-4 text-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-fey-smoke/60",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex rounded-pill bg-fey-charcoal border border-fey-smoke p-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									sfx.tap();
									setActionMode("buy");
								},
								className: `inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-xs font-semibold transition-colors ${actionMode === "buy" ? "bg-fey-growth/20 text-fey-growth border border-fey-growth" : "text-fey-graphite hover:text-fey-mist border border-transparent"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Buy (Add)" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									sfx.tap();
									setActionMode("sell");
								},
								className: `inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-xs font-semibold transition-colors ${actionMode === "sell" ? "bg-fey-ember/20 text-fey-ember border border-fey-ember" : "text-fey-graphite hover:text-fey-mist border border-transparent"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingDown, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Sell" })]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-caption text-fey-graphite",
								children: "Order Type"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "inline-flex rounded-pill bg-fey-charcoal border border-fey-smoke p-0.5",
								children: ["market", "limit"].map((mode) => {
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											sfx.tap();
											setOrderType(mode);
										},
										className: `rounded-pill px-3.5 py-1 text-xs font-medium capitalize transition-colors ${orderType === mode ? "bg-fey-ink text-fey-white border border-fey-signal" : "text-fey-graphite hover:text-fey-mist border border-transparent"}`,
										children: mode
									}, mode);
								})
							})]
						})]
					}),
					orderType === "limit" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-caption text-fey-graphite block",
							children: "Target Limit Price (¢)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between rounded-pill bg-fey-charcoal border border-fey-smoke px-4 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								inputMode: "decimal",
								"aria-label": "Target limit price in cents",
								value: limitPriceCents,
								onChange: (e) => setLimitPriceCents(e.target.value),
								placeholder: defaultCents,
								className: "w-full min-w-0 bg-transparent tnum text-body text-fey-white outline-none"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fey-graphite shrink-0",
								children: "¢ / share"
							})]
						})]
					}) : null,
					actionMode === "buy" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-caption text-fey-graphite",
									children: "Add Stake (USDC)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tnum text-fey-mist",
									children: ["Available: ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
										className: "text-fey-white",
										children: ["$", formatUsdc(available)]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between rounded-pill bg-fey-charcoal border border-fey-smoke px-4 py-2.5 focus-within:border-fey-signal",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-fey-graphite font-medium",
										children: "$"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										inputMode: "decimal",
										"aria-label": "USDC amount to add",
										value: buyUsdcInput,
										onChange: (e) => {
											setBuyBalancePct(null);
											setBuyUsdcInput(e.target.value);
										},
										placeholder: "25",
										className: "w-full min-w-0 bg-transparent px-2 tnum text-body font-semibold text-fey-white outline-none"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-caption text-fey-graphite shrink-0",
										children: "USDC"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-4 gap-2",
								children: [
									25,
									50,
									75,
									100
								].map((pct) => {
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => handleSelectBuyPct(pct),
										className: `h-8 rounded-pill text-xs font-medium tnum border transition-colors ${buyBalancePct === pct ? "bg-fey-ink border-fey-growth text-fey-growth" : "bg-fey-charcoal border-fey-smoke text-fey-mist hover:text-fey-white"}`,
										children: [pct, "% Bal"]
									}, pct);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-fey-smoke/60",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-fey-graphite block",
									children: "Estimated Shares Added"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tnum text-body font-semibold text-fey-growth",
									children: [
										"+",
										formatShares(estAddedSharesMicro),
										" ",
										item.side.toUpperCase(),
										" shares"
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: handleExecuteBuy,
									className: "ghost-pill-cta h-10 px-5 text-xs font-semibold",
									children: orderType === "limit" ? `Limit Buy +$${buyUsdcInput || "0"} (${limitPriceCents}¢)` : `Market Buy +$${buyUsdcInput || "0"} USDC`
								})]
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-caption text-fey-graphite",
									children: "Position Size to Sell (%)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tnum text-fey-mist",
									children: [
										"Selling ",
										formatShares(sharesToSellMicro),
										" shares (",
										effectiveSellPct,
										"%)"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-5 gap-1.5",
								children: [[
									25,
									50,
									75,
									100
								].map((preset) => {
									const isSelected = Math.abs(effectiveSellPct - preset) < .01;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											sfx.tap();
											setSellPct(preset);
											setCustomSellPctInput(String(preset));
										},
										className: `h-8 rounded-pill text-xs font-medium tnum border transition-colors ${isSelected ? "bg-fey-ink border-fey-white text-fey-white" : "bg-fey-charcoal border-fey-smoke text-fey-mist hover:text-fey-white"}`,
										children: [preset, "%"]
									}, preset);
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center rounded-pill bg-fey-charcoal border border-fey-smoke px-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										inputMode: "decimal",
										"aria-label": "Custom sell percentage",
										value: customSellPctInput,
										onChange: (e) => {
											const raw = e.target.value;
											const parsed = Number.parseFloat(raw);
											setCustomSellPctInput(raw);
											if (Number.isFinite(parsed)) setSellPct(Math.max(1, Math.min(100, parsed)));
										},
										className: "w-full min-w-0 bg-transparent text-center tnum text-xs text-fey-white outline-none"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-fey-graphite",
										children: "%"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-fey-smoke/60",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-fey-graphite block",
									children: "Estimated Proceeds"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tnum text-body font-semibold text-fey-growth",
									children: [
										"$",
										formatUsdc(estProceedsMicro),
										" USDC"
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: handleExecuteSell,
									className: "ghost-pill-cta h-10 px-5 text-xs font-semibold",
									children: orderType === "limit" ? `Submit Limit Sell (${effectiveSellPct}%)` : `Market Sell (${effectiveSellPct}%)`
								})]
							})
						]
					})
				]
			}) : null
		]
	});
}
export { PositionManagerCard as t };
