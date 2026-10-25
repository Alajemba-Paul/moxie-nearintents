import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, J as require_react, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as ExternalLink, D as Coins, F as ArrowDownLeft, M as ArrowUpRight, m as RotateCcw, s as Sparkles, w as Droplets } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { A as derivePolygonAddress, C as formatUsdc, D as positionsOf, G as useServerFn, O as shortHex, Y as sfx, a as requestDevnetSolAirdrop, b as enrichPosition, g as reclaimIntentDb, h as listIntents, j as MARKETS, k as shortKey, s as useDesk } from "./router-CSvPMnxF.mjs";
import { t as PositionManagerCard } from "./position-manager-card-V72seBW7.mjs";
// node_modules/.nitro/vite/services/ssr/assets/portfolio-C_cZ3cmY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function formatBalanceOrZero(micro, isConnected) {
	if (!isConnected || micro <= 0) return "0.00";
	return formatUsdc(micro);
}
function PortfolioPage() {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [solFaucetBusy, setSolFaucetBusy] = (0, import_react.useState)(false);
	const [usdcFaucetBusy, setUsdcFaucetBusy] = (0, import_react.useState)(false);
	const [polFaucetBusy, setPolFaucetBusy] = (0, import_react.useState)(false);
	const [faucetStatus, setFaucetStatus] = (0, import_react.useState)(null);
	const list = useServerFn(listIntents);
	const reclaimDb = useServerFn(reclaimIntentDb);
	const connected = useDesk((s) => s.connected);
	const orders = useDesk((s) => s.orders);
	const available = useDesk((s) => s.available);
	const publicKeyB58 = useDesk((s) => s.publicKeyB58);
	const externalPublicKey = useDesk((s) => s.externalPublicKey);
	const setActiveModal = useDesk((s) => s.setActiveModal);
	const refundOrder = useDesk((s) => s.refundOrder);
	const mintTestUsdc = useDesk((s) => s.mintTestUsdc);
	const pushConsoleLog = useDesk((s) => s.pushConsoleLog);
	const hydrateFromDb = useDesk((s) => s.hydrateFromDb);
	const isConnected = ready && connected;
	const activeSolanaKey = (externalPublicKey ?? publicKeyB58).trim();
	const derivedPolygon = (0, import_react.useMemo)(() => activeSolanaKey ? derivePolygonAddress(activeSolanaKey) : "", [activeSolanaKey]);
	(0, import_react.useEffect)(() => {
		Promise.resolve(useDesk.persist.rehydrate()).finally(() => setReady(true));
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready || !connected || !activeSolanaKey) return;
		const targetWallet = activeSolanaKey;
		let cancelled = false;
		list({ data: targetWallet }).then((res) => {
			if (!cancelled) hydrateFromDb(targetWallet, res.rows);
		}).catch(() => void 0);
		return () => {
			cancelled = true;
		};
	}, [
		ready,
		connected,
		activeSolanaKey,
		list,
		hydrateFromDb
	]);
	const hydratedOrders = (0, import_react.useMemo)(() => isConnected && activeSolanaKey ? orders.filter((o) => o.intent.taker === activeSolanaKey) : [], [
		isConnected,
		activeSolanaKey,
		orders
	]);
	const positions = (0, import_react.useMemo)(() => positionsOf(hydratedOrders), [hydratedOrders]);
	const shareSummary = (0, import_react.useMemo)(() => {
		let totalMarkMicro = 0;
		let totalCostMicro = 0;
		return {
			enriched: positions.map((pos) => {
				const m = MARKETS.find((item) => item.id === pos.marketId) ?? MARKETS[0];
				const item = enrichPosition(pos, m);
				totalMarkMicro += item.currentValueMicro;
				totalCostMicro += item.costMicro;
				return item;
			}),
			totalMarkMicro,
			totalCostMicro
		};
	}, [positions]);
	const effectiveAvailable = isConnected ? available : 0;
	const totalPortfolioMicro = effectiveAvailable + shareSummary.totalMarkMicro;
	async function handleReclaimUsdc(orderId, dbRowId) {
		sfx.tap();
		const now = Math.floor(Date.now() / 1e3) + 3600;
		refundOrder(orderId, now);
		if (dbRowId) {
			await reclaimDb({ data: dbRowId }).catch(() => void 0);
			const updated = await list({ data: activeSolanaKey }).catch(() => null);
			if (updated) hydrateFromDb(activeSolanaKey, updated.rows);
		}
		pushConsoleLog(`[solana:userRefund] reclaimed locked USDC for intent ${shortKey(orderId, 6, 4)}`);
		toast("Reclaimed locked USDC back to your Available Balance.");
	}
	async function handleRequestSolAirdrop() {
		if (!isConnected) {
			toast("Log in or connect your wallet in the top header first.");
			return;
		}
		if (solFaucetBusy) return;
		sfx.tap();
		setSolFaucetBusy(true);
		setFaucetStatus(null);
		try {
			const res = await requestDevnetSolAirdrop(activeSolanaKey, .1);
			sfx.bought();
			setFaucetStatus({
				type: "success",
				text: `Airdropped ${res.amountSol} Devnet SOL to ${shortKey(activeSolanaKey, 6, 4)}.`,
				txUrl: `https://explorer.solana.com/tx/${res.signature}?cluster=devnet`
			});
			toast(`Airdropped ${res.amountSol} Devnet SOL.`);
		} catch (err) {
			sfx.nope();
			const message = err instanceof Error ? err.message : "Solana Devnet RPC rate limit reached. Use the official Solana Faucet link.";
			setFaucetStatus({
				type: "error",
				text: message
			});
			toast(message);
		} finally {
			setSolFaucetBusy(false);
		}
	}
	async function handleMintTestUsdc() {
		if (!isConnected) {
			toast("Log in or connect your wallet in the top header first.");
			return;
		}
		if (usdcFaucetBusy) return;
		sfx.tap();
		setUsdcFaucetBusy(true);
		setFaucetStatus(null);
		try {
			const res = await fetch("/api/faucet/usdc", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					recipient: activeSolanaKey,
					amountUsdc: 100
				})
			});
			const data = await res.json();
			if (!res.ok || !data.ok) throw new Error(data.error || "Failed to mint Devnet Test USDC.");
			sfx.bought();
			const amount = data.amountUsdc ?? 100;
			mintTestUsdc(amount * 1e6);
			setFaucetStatus({
				type: "success",
				text: `Minted $${amount} Test USDC to ${shortKey(activeSolanaKey, 6, 4)}.`,
				txUrl: data.explorerUrl
			});
			toast(`Minted $${amount} Test USDC.`);
		} catch (err) {
			sfx.nope();
			const message = err instanceof Error ? err.message : "Test USDC mint failed.";
			setFaucetStatus({
				type: "error",
				text: message
			});
			toast(message);
		} finally {
			setUsdcFaucetBusy(false);
		}
	}
	async function handleRequestTestnetPol() {
		if (!isConnected) {
			toast("Log in or connect your wallet in the top header first.");
			return;
		}
		if (polFaucetBusy) return;
		sfx.tap();
		setPolFaucetBusy(true);
		setFaucetStatus(null);
		try {
			const res = await fetch("/api/faucet/pol", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					recipient: derivedPolygon,
					amountPol: "0.1"
				})
			});
			const data = await res.json();
			if (!res.ok || !data.ok) throw new Error(data.error || "Failed to transfer Testnet POL.");
			sfx.bought();
			setFaucetStatus({
				type: "success",
				text: `Sent ${data.amountPol ?? "0.1"} Testnet POL to ${shortHex(derivedPolygon, 6, 4)} on Polygon Amoy.`,
				txUrl: data.explorerUrl
			});
			toast(`Sent ${data.amountPol ?? "0.1"} Testnet POL.`);
		} catch (err) {
			sfx.nope();
			const message = err instanceof Error ? err.message : "Testnet POL transfer failed.";
			setFaucetStatus({
				type: "error",
				text: message
			});
			toast(message);
		} finally {
			setPolFaucetBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "py-10 space-y-12 w-full max-w-full overflow-x-hidden box-border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "fey-card p-6 space-y-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-caption text-fey-graphite",
							children: "Total Portfolio Value"
						}), !isConnected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-pill bg-fey-obsidian border border-fey-smoke px-3 py-1 text-caption text-fey-graphite",
							children: "Disconnected"
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-baseline justify-between gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "tnum text-display-lg text-fey-white",
							children: ["$", formatBalanceOrZero(totalPortfolioMicro, isConnected)]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: !isConnected,
								onClick: () => {
									sfx.tap();
									setActiveModal("deposit");
								},
								className: "ghost-pill-cta inline-flex h-10 items-center gap-2 px-4 text-xs font-medium disabled:opacity-50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownLeft, { className: "size-3.5 text-fey-growth" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Deposit (Add cash)" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: !isConnected,
								onClick: () => {
									sfx.tap();
									setActiveModal("withdraw");
								},
								className: "inline-flex h-10 items-center gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 text-xs font-medium text-fey-white hover:border-fey-pale transition-colors disabled:opacity-50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-3.5 text-fey-ember" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Withdraw (Cash out)" })]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2 pt-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "fey-well p-3.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-caption text-fey-graphite block",
								children: "Available Balance"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "tnum mt-1 block text-heading text-fey-white",
								children: ["$", formatBalanceOrZero(effectiveAvailable, isConnected)]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "fey-well p-3.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-caption text-fey-graphite block",
								children: "Active Share Value"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "tnum mt-1 block text-heading text-fey-growth",
								children: ["$", formatBalanceOrZero(shareSummary.totalMarkMicro, isConnected)]
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-caption text-fey-graphite",
						children: "Active Positions"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-heading text-fey-white",
						children: "Live Markets"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/markets",
						className: "rounded-pill bg-fey-charcoal border border-fey-smoke px-4 py-2 text-xs font-medium text-fey-white hover:border-fey-pale",
						children: "Trade More Markets"
					})]
				}), !isConnected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "fey-card p-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-heading-sm text-fey-white",
						children: "Connect a wallet to view your portfolio."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-body text-fey-graphite",
						children: "Use the Log in / Sign up button in the top header to view your balances and manage live positions."
					})]
				}) : shareSummary.enriched.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "fey-card p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-heading-sm text-fey-white",
						children: "No open positions in Live Markets yet."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-body text-fey-graphite",
						children: "Trade on any market to manage your live positions here."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/markets",
						className: "ghost-pill-cta inline-flex h-10 items-center px-5 text-xs font-medium shrink-0",
						children: "Browse Markets"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `grid gap-6 ${shareSummary.enriched.length > 1 ? "xl:grid-cols-2" : "grid-cols-1"}`,
					children: shareSummary.enriched.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PositionManagerCard, {
						item,
						showMarketLink: true
					}, item.tokenId))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "fey-card p-6 space-y-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-fey-smoke",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-caption text-fey-signal",
							children: "Devnet & Amoy Sandbox"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-heading text-fey-white",
							children: "Testnet Faucets & Setup"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-fey-graphite",
							children: "New wallets are auto-funded with 0.1 SOL, 1,000 USDC & 0.1 POL"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 md:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "fey-well p-4 flex flex-col justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "inline-flex size-8 items-center justify-center rounded-icon bg-fey-charcoal border border-fey-smoke text-fey-signal",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Droplets, { className: "size-4" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-caption text-fey-graphite",
												children: "Solana Devnet"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "text-heading-sm text-fey-white",
											children: "Get Devnet SOL"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-fey-mist",
											children: [
												"Request 0.1 Devnet SOL to cover transaction fees on",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "tnum text-fey-white",
													children: isConnected ? shortKey(activeSolanaKey, 4, 4) : "your wallet"
												}),
												"."
											]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: solFaucetBusy || !isConnected,
										onClick: () => void handleRequestSolAirdrop(),
										className: "ghost-pill-cta flex h-10 w-full items-center justify-center gap-2 px-4 text-xs font-medium disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Droplets, { className: "size-3.5 text-fey-signal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: solFaucetBusy ? "Requesting SOL…" : "Request 0.1 Devnet SOL" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: "https://faucet.solana.com",
										target: "_blank",
										rel: "noreferrer",
										className: "flex h-9 w-full items-center justify-center gap-1.5 rounded-pill bg-fey-charcoal border border-fey-smoke px-3 text-xs text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Open Solana Faucet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "fey-well p-4 flex flex-col justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "inline-flex size-8 items-center justify-center rounded-icon bg-fey-charcoal border border-fey-smoke text-fey-growth",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "size-4" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-caption text-fey-growth",
												children: "SPL Token Mint"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "text-heading-sm text-fey-white",
											children: "One-Click Test USDC Mint"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-fey-mist",
											children: "Mint $100 Test USDC directly to your Solana wallet via our Devnet treasury authority."
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: usdcFaucetBusy || !isConnected,
										onClick: () => void handleMintTestUsdc(),
										className: "ghost-pill-cta flex h-10 w-full items-center justify-center gap-2 px-4 text-xs font-medium disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-3.5 text-fey-growth" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: usdcFaucetBusy ? "Minting Test USDC…" : "Mint 100 Test USDC" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: !isConnected,
										onClick: () => setActiveModal("deposit"),
										className: "flex h-9 w-full items-center justify-center gap-1.5 rounded-pill bg-fey-charcoal border border-fey-smoke px-3 text-xs text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors disabled:opacity-50",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Open Add Cash Modal" })
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "fey-well p-4 flex flex-col justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "inline-flex size-8 items-center justify-center rounded-icon bg-fey-charcoal border border-fey-smoke text-fey-ember",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-4" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-caption text-fey-ember",
												children: "Polygon Amoy"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "text-heading-sm text-fey-white",
											children: "Airdrop Testnet POL"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-fey-mist",
											children: [
												"Transfer 0.1 Testnet POL on Polygon Amoy to your derived address",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "tnum text-fey-white",
													children: isConnected ? shortHex(derivedPolygon, 6, 4) : "0x0000…0000"
												}),
												"."
											]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: polFaucetBusy || !isConnected,
										onClick: () => void handleRequestTestnetPol(),
										className: "ghost-pill-cta flex h-10 w-full items-center justify-center gap-2 px-4 text-xs font-medium disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-3.5 text-fey-ember" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: polFaucetBusy ? "Sending Testnet POL…" : "Airdrop 0.1 Testnet POL" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: "https://faucet.polygon.technology",
										target: "_blank",
										rel: "noreferrer",
										className: "flex h-9 w-full items-center justify-center gap-1.5 rounded-pill bg-fey-charcoal border border-fey-smoke px-3 text-xs text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Polygon Amoy Faucet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })]
									})]
								})]
							})
						]
					}),
					faucetStatus ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `rounded-well border px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2 ${faucetStatus.type === "success" ? "bg-fey-obsidian border-fey-growth/60 text-fey-growth" : "bg-fey-obsidian border-fey-ember/60 text-fey-ember"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: faucetStatus.text }), faucetStatus.txUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: faucetStatus.txUrl,
							target: "_blank",
							rel: "noreferrer",
							className: "inline-flex items-center gap-1 font-medium underline",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "View Transaction" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })]
						}) : null]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-caption text-fey-graphite",
						children: "Activity Ledger"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-heading text-fey-white",
						children: "Trade History & Reclaim"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "tnum text-xs text-fey-graphite",
						children: [isConnected ? hydratedOrders.length : 0, " total trades"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fey-card overflow-hidden",
					children: !isConnected || hydratedOrders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-8 text-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-body text-fey-graphite",
							children: !isConnected ? "Connect your wallet to view your trade history and reclaimable escrows." : "No trades recorded for this wallet yet. When you trade on a market, your status and transaction hash appear here."
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-left border-collapse",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-fey-smoke text-caption text-fey-graphite bg-fey-obsidian",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-3 px-4",
										children: "Market / Side"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-3 px-4",
										children: "Amount (USDC)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-3 px-4",
										children: "Slippage"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-3 px-4",
										children: "Status"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-3 px-4",
										children: "Txn Hash"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-fey-smoke/50 text-xs tnum",
								children: hydratedOrders.map((order) => {
									const m = MARKETS.find((item) => item.id === order.intent.marketId);
									const canReclaim = order.phase === "escrow_locked" || order.phase === "solver_matched";
									const rawHash = order.polygonTxHex ? order.polygonTxHex.startsWith("0x") ? order.polygonTxHex : `0x${order.polygonTxHex}` : `0x${order.commitmentHex.slice(0, 64)}`;
									const explorerHref = order.polygonTxHex ? `https://amoy.polygonscan.com/tx/${rawHash}` : `https://explorer.solana.com/tx/${order.signatureHex.slice(0, 64)}?cluster=devnet`;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "hover:bg-fey-obsidian/50",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
												className: "py-3.5 px-4",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-medium text-fey-white block",
													children: m?.question ?? order.intent.marketId
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: order.intent.side === "yes" ? "text-fey-growth" : "text-fey-ember",
													children: order.intent.side.toUpperCase()
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
												className: "py-3.5 px-4 text-fey-white font-medium",
												children: ["$", formatUsdc(order.intent.sizeMicro)]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
												className: "py-3.5 px-4 text-fey-mist",
												children: [(order.intent.maxSlippageBps / 100).toFixed(1), "%"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-3.5 px-4",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `rounded-pill px-2.5 py-1 text-[11px] font-medium ${order.phase === "settled" ? "bg-fey-growth/15 text-fey-growth" : order.phase === "refunded" ? "bg-fey-obsidian text-fey-mist border border-fey-smoke" : "bg-fey-ember/15 text-fey-ember"}`,
													children: order.phase.toUpperCase()
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-3.5 px-4",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex flex-wrap items-center gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
														href: explorerHref,
														target: "_blank",
														rel: "noreferrer",
														className: "text-fey-signal hover:underline inline-flex items-center gap-1",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: shortHex(rawHash, 6, 4) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })]
													}), canReclaim ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														type: "button",
														onClick: () => void handleReclaimUsdc(order.id),
														className: "inline-flex items-center gap-1 rounded-pill bg-fey-obsidian border border-fey-ember px-2.5 py-0.5 text-[11px] font-medium text-fey-ember hover:bg-fey-ember/15",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reclaim USDC" })]
													}) : null]
												})
											})
										]
									}, order.id);
								})
							})]
						})
					})
				})]
			})
		]
	});
}
export { PortfolioPage as component };
