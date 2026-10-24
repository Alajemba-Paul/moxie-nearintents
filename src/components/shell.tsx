import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Compass,
  Copy,
  Home,
  KeyRound,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Sun,
  UserCheck,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast, Toaster } from "sonner";
import { derivePolygonAddress } from "@/lib/derive-proxy";
import { formatUsdc, parseUsdc, shortHex, shortKey } from "@/lib/moxie/format";
import { listIntents } from "@/lib/moxie/intents.functions";
import { MARKETS } from "@/lib/moxie/markets";
import { sfx } from "@/lib/moxie/sound";
import {
  applyThemeToDocument,
  THEME_STORAGE_KEY,
  useDesk,
  validateSlippagePercent,
  type ThemePreference,
} from "@/lib/moxie/store";
import {
  buildWithdrawUsdcTransaction,
  injectedProvider,
  isValidSolanaAddress,
  openMobileWallet,
  readDevnetBalance,
  type InjectedWallet,
} from "@/lib/solana/wallet";

const NAV_LINKS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/markets", label: "Markets", icon: Compass },
  { to: "/portfolio", label: "Portfolio", icon: Wallet },
] as const;

const EXTERNAL_WALLETS: { id: InjectedWallet; label: string; subtitle: string }[] = [
  { id: "Phantom", label: "Phantom", subtitle: "Solana browser & mobile wallet" },
  { id: "Solflare", label: "Solflare", subtitle: "Solana extension & hardware wallet" },
  { id: "Backpack", label: "Backpack", subtitle: "Solana trading wallet" },
];

const SPRING = { type: "spring" as const, stiffness: 300, damping: 28, mass: 0.8 };
const LOGO_SRC = "/assets/aistudio/Moxie_logo_8a77754a.jfif";

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const listDbIntents = useServerFn(listIntents);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [copiedSolana, setCopiedSolana] = useState(false);
  const [copiedPolygon, setCopiedPolygon] = useState(false);
  const [slipInput, setSlipInput] = useState("1.0");
  const [slipError, setSlipError] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const walletDropdownRef = useRef<HTMLDivElement>(null);
  const inFlightOnboardRef = useRef<Set<string>>(new Set());

  const available = useDesk((s) => s.available);
  const connected = useDesk((s) => s.connected);
  const connectLabel = useDesk((s) => s.connectLabel);
  const publicKeyB58 = useDesk((s) => s.publicKeyB58);
  const externalPublicKey = useDesk((s) => s.externalPublicKey);
  const slippagePct = useDesk((s) => s.slippagePct);
  const theme = useDesk((s) => s.theme);
  const activeModal = useDesk((s) => s.activeModal);
  const setActiveModal = useDesk((s) => s.setActiveModal);
  const setSlippagePct = useDesk((s) => s.setSlippagePct);
  const setTheme = useDesk((s) => s.setTheme);
  const disconnect = useDesk((s) => s.disconnect);
  const completeAutoOnboard = useDesk((s) => s.completeAutoOnboard);
  const hydrateFromDb = useDesk((s) => s.hydrateFromDb);

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  const activeSolanaKey = (externalPublicKey ?? publicKeyB58).trim();
  const derivedPolygon = useMemo(
    () => (activeSolanaKey ? derivePolygonAddress(activeSolanaKey) : ""),
    [activeSolanaKey],
  );

  useEffect(() => {
    // Immediately restore theme from localStorage before or alongside store hydration
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "dark" || saved === "light" || saved === "system") {
        setTheme(saved);
        setResolvedTheme(applyThemeToDocument(saved));
      } else {
        setResolvedTheme(applyThemeToDocument(useDesk.getState().theme));
      }
    }
    void Promise.resolve(useDesk.persist.rehydrate()).finally(() => {
      setReady(true);
      setSlipInput(useDesk.getState().slippagePct.toFixed(1));
      const saved =
        typeof window !== "undefined" ? window.localStorage.getItem(THEME_STORAGE_KEY) : null;
      const effectiveTheme: ThemePreference =
        saved === "dark" || saved === "light" || saved === "system"
          ? saved
          : useDesk.getState().theme;
      setTheme(effectiveTheme);
      setResolvedTheme(applyThemeToDocument(effectiveTheme));
    });
  }, [setTheme]);

  useEffect(() => {
    setResolvedTheme(applyThemeToDocument(theme));
    if (
      theme === "system" &&
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
    ) {
      const media = window.matchMedia("(prefers-color-scheme: light)");
      const listener = () => {
        setResolvedTheme(applyThemeToDocument("system"));
      };
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [theme]);

  useEffect(() => {
    setSlipInput(slippagePct.toFixed(1));
  }, [slippagePct]);

  // Idempotent Auto-Onboarding & Per-Wallet Position/History Rehydration
  useEffect(() => {
    if (!ready || !connected || !activeSolanaKey || !derivedPolygon) return;

    const targetWallet = activeSolanaKey;
    const storageKey = `moxie_onboarded_v2_${targetWallet}`;
    let cancelled = false;

    async function syncAndOnboardWallet() {
      // 1. Rehydrate any persisted backend DB intents for this exact wallet
      try {
        const dbRes = await listDbIntents({ data: targetWallet });
        if (!cancelled) {
          hydrateFromDb(targetWallet, dbRes.rows);
        }
      } catch {
        // Offline or local-only mode
      }

      // 2. Idempotent auto-onboarding check (never fires twice for the same wallet)
      const alreadyMarkedLocal =
        typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "1";
      if (alreadyMarkedLocal || useDesk.getState().onboarded) {
        completeAutoOnboard(targetWallet);
        return;
      }

      if (inFlightOnboardRef.current.has(targetWallet)) {
        return;
      }
      inFlightOnboardRef.current.add(targetWallet);

      try {
        const res = await fetch("/api/faucet/auto-onboard", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            solanaAddress: targetWallet,
            polygonAddress: derivedPolygon,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok?: boolean;
          alreadyFunded?: boolean;
          funded?: { sol?: string; usdc?: number; pol?: string };
        };
        if (cancelled || !data.ok) return;

        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, "1");
        }
        completeAutoOnboard(targetWallet);

        if (!data.alreadyFunded) {
          toast(
            `Wallet auto-funded: +${data.funded?.sol ?? "0.1"} Devnet SOL, +$${(data.funded?.usdc ?? 1000).toLocaleString("en-US")} Test USDC & +${data.funded?.pol ?? "0.1"} Testnet POL.`,
          );
        }
      } catch {
        // Even if RPC is unreachable in sandbox, ensure initial 1000 Test USDC allocation is credited once
        if (!cancelled) {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, "1");
          }
          completeAutoOnboard(targetWallet);
        }
      } finally {
        inFlightOnboardRef.current.delete(targetWallet);
      }
    }

    void syncAndOnboardWallet();
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    connected,
    activeSolanaKey,
    derivedPolygon,
    listDbIntents,
    completeAutoOnboard,
    hydrateFromDb,
  ]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActiveModal(useDesk.getState().activeModal === "cmdk" ? null : "cmdk");
      }
      if (e.key === "Escape") {
        setSettingsOpen(false);
        setWalletDropdownOpen(false);
        if (useDesk.getState().activeModal) setActiveModal(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setActiveModal]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(e.target as Node)) {
        setWalletDropdownOpen(false);
      }
    }
    if (settingsOpen || walletDropdownOpen) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [settingsOpen, walletDropdownOpen]);

  function applyCustomSlippage(value: string) {
    setSlipInput(value);
    const parsed = Number.parseFloat(value);
    const check = validateSlippagePercent(parsed);
    if (!check.valid) {
      setSlipError(check.error ?? "Enter 0.1% to 50.0%");
      return;
    }
    setSlipError(null);
    setSlippagePct(check.clamped);
  }

  function handleCopySolana() {
    void navigator.clipboard?.writeText(activeSolanaKey);
    setCopiedSolana(true);
    toast("Solana address copied.");
    setTimeout(() => setCopiedSolana(false), 1800);
  }

  function handleCopyPolygon() {
    void navigator.clipboard?.writeText(derivedPolygon);
    setCopiedPolygon(true);
    toast("Derived Polygon address copied.");
    setTimeout(() => setCopiedPolygon(false), 1800);
  }

  async function handleDisconnectWallet() {
    sfx.tap();
    if (
      connectLabel === "Phantom" ||
      connectLabel === "Solflare" ||
      connectLabel === "Backpack"
    ) {
      const provider = injectedProvider(connectLabel as InjectedWallet);
      await provider?.disconnect?.().catch(() => undefined);
    }
    disconnect();
    setWalletDropdownOpen(false);
    setSettingsOpen(false);
    toast("Wallet disconnected.");
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-fey-ink text-fey-white flex flex-col box-border">
      {ready ? (
        <Toaster
          theme={resolvedTheme}
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--color-fey-charcoal)",
              color: "var(--color-fey-white)",
              border: "1px solid var(--color-fey-smoke)",
              borderRadius: "16px",
            },
          }}
        />
      ) : null}

      {/* Top Header (Brand Logo + Title on Left, Wallet Dropdown + Settings on Right) */}
      <header className="sticky top-0 z-40 w-full max-w-full border-b border-fey-smoke bg-fey-ink/95 backdrop-blur-md box-border">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 box-border">
          {/* Left: Brand Logo + Title */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-heading-sm font-bold tracking-tight text-fey-white whitespace-nowrap shrink-0"
          >
            <img
              src={LOGO_SRC}
              alt="Moxie Markets logo"
              referrerPolicy="no-referrer"
              className="size-8 rounded-icon object-cover border border-fey-smoke shrink-0"
            />
            <span>Moxie Markets</span>
          </Link>

          {/* Right: Connected Wallet Dropdown OR Log in / Sign up Pill + Settings Gear */}
          <div className="flex items-center gap-2 shrink-0">
            {ready && connected ? (
              <div className="relative" ref={walletDropdownRef}>
                <button
                  type="button"
                  aria-expanded={walletDropdownOpen}
                  onClick={() => {
                    sfx.tap();
                    setWalletDropdownOpen((v) => !v);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-pill bg-fey-obsidian border border-fey-signal/60 px-3.5 text-xs font-medium text-fey-white hover:border-fey-signal transition-colors whitespace-nowrap shrink-0"
                >
                  <span className="size-2 rounded-full bg-fey-growth shrink-0" />
                  <span className="max-w-[96px] sm:max-w-[140px] truncate">
                    {connectLabel ?? "Account"}
                  </span>
                  <span className="hidden sm:inline text-fey-graphite">·</span>
                  <span className="hidden sm:inline tnum text-fey-mist">
                    {shortKey(activeSolanaKey, 4, 4)}
                  </span>
                  <ChevronDown className="size-3.5 text-fey-mist shrink-0" />
                </button>

                <AnimatePresence>
                  {walletDropdownOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={SPRING}
                      className="fey-card absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] p-4 z-50 space-y-3.5"
                    >
                      <div className="flex items-center justify-between pb-2.5 border-b border-fey-smoke">
                        <span className="text-heading-sm text-fey-white">Connected Wallet</span>
                        <span className="rounded-pill bg-fey-obsidian border border-fey-growth/60 px-2.5 py-0.5 text-[11px] text-fey-growth">
                          {connectLabel ?? "Active"}
                        </span>
                      </div>

                      {/* Solana Address with Copy */}
                      <div className="fey-well p-3 space-y-1.5">
                        <span className="text-caption text-fey-graphite block">Solana Address</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="tnum text-xs text-fey-white font-medium" title={activeSolanaKey}>
                            {shortKey(activeSolanaKey, 4, 4)}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopySolana}
                            className="inline-flex items-center gap-1.5 rounded-pill bg-fey-charcoal border border-fey-smoke px-2.5 py-1 text-xs font-medium text-fey-white hover:border-fey-pale transition-colors shrink-0"
                          >
                            {copiedSolana ? (
                              <>
                                <Check className="size-3.5 text-fey-growth" />
                                <span className="text-fey-growth">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5 text-fey-mist" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Derived Polygon Address with Copy */}
                      <div className="fey-well p-3 space-y-1.5">
                        <span className="text-caption text-fey-graphite block">
                          Derived Polygon Address
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="tnum text-xs text-fey-signal font-medium" title={derivedPolygon}>
                            {shortHex(derivedPolygon, 6, 4)}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyPolygon}
                            className="inline-flex items-center gap-1.5 rounded-pill bg-fey-charcoal border border-fey-smoke px-2.5 py-1 text-xs font-medium text-fey-white hover:border-fey-pale transition-colors shrink-0"
                          >
                            {copiedPolygon ? (
                              <>
                                <Check className="size-3.5 text-fey-growth" />
                                <span className="text-fey-growth">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5 text-fey-mist" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-fey-smoke">
                        <button
                          type="button"
                          onClick={() => void handleDisconnectWallet()}
                          className="flex w-full h-10 items-center justify-center gap-2 rounded-pill bg-fey-obsidian border border-fey-ember px-4 text-xs font-medium text-fey-ember hover:bg-fey-ember/15 transition-colors"
                        >
                          <LogOut className="size-3.5" />
                          <span>Disconnect Wallet</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                disabled={!ready}
                onClick={() => {
                  sfx.tap();
                  setActiveModal("connect");
                }}
                className="ghost-pill-cta inline-flex h-10 items-center gap-2 px-4 sm:px-5 text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <UserCheck className="size-3.5 text-fey-ember shrink-0" />
                <span>Log in / Sign up</span>
              </button>
            )}

            {/* Settings Gear Dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                aria-label="Settings"
                aria-expanded={settingsOpen}
                onClick={() => {
                  sfx.tap();
                  setSettingsOpen((v) => !v);
                }}
                className="flex size-10 items-center justify-center rounded-pill bg-fey-charcoal border border-fey-smoke text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors shrink-0"
              >
                <Settings className="size-4" />
              </button>

              <AnimatePresence>
                {settingsOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={SPRING}
                    className="fey-card absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] p-5 z-50"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-fey-smoke">
                      <span className="text-heading-sm text-fey-white">Settings</span>
                      <span className="tnum text-caption text-fey-signal">
                        {slippagePct.toFixed(1)}%
                      </span>
                    </div>

                    {/* Theme Toggle (Dark Mode / Light Mode / System Default) */}
                    <div className="mt-4 pb-4 border-b border-fey-smoke">
                      <span className="text-caption text-fey-graphite block">
                        Appearance · Theme
                      </span>
                      <div
                        className="mt-2 grid grid-cols-3 gap-2"
                        role="group"
                        aria-label="Theme selection"
                      >
                        {(
                          [
                            { id: "dark", label: "Dark Mode", shortLabel: "Dark", icon: Moon },
                            { id: "light", label: "Light Mode", shortLabel: "Light", icon: Sun },
                            { id: "system", label: "System Default", shortLabel: "System", icon: Monitor },
                          ] as const
                        ).map((opt) => {
                          const Icon = opt.icon;
                          const active = theme === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              aria-pressed={active}
                              aria-label={opt.label}
                              onClick={() => {
                                sfx.tap();
                                setTheme(opt.id);
                              }}
                              className={`flex h-9 items-center justify-center gap-1.5 rounded-pill text-xs font-medium border transition-colors ${
                                active
                                  ? "bg-fey-ink border-fey-white text-fey-white"
                                  : "bg-fey-obsidian border-fey-smoke text-fey-mist hover:text-fey-white"
                              }`}
                            >
                              <Icon className="size-3.5 shrink-0" />
                              <span>{opt.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Slippage Settings (Percentage Only) */}
                    <div className="mt-4">
                      <label className="text-caption text-fey-graphite block" htmlFor="slippage-custom-input">
                        Slippage (%) · Price room
                      </label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {[0.5, 1.0, 2.0].map((preset) => {
                          const active = Math.abs(slippagePct - preset) < 0.01;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                sfx.tap();
                                setSlipError(null);
                                setSlippagePct(preset);
                                setSlipInput(preset.toFixed(1));
                              }}
                              className={`h-9 rounded-pill text-xs font-medium tnum border transition-colors ${
                                active
                                  ? "bg-fey-ink border-fey-white text-fey-white"
                                  : "bg-fey-obsidian border-fey-smoke text-fey-mist hover:text-fey-white"
                              }`}
                            >
                              {preset.toFixed(1)}%
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-3.5 py-1.5">
                        <input
                          id="slippage-custom-input"
                          type="text"
                          inputMode="decimal"
                          value={slipInput}
                          onChange={(e) => applyCustomSlippage(e.target.value)}
                          placeholder="1.0"
                          className="w-full bg-transparent text-body tnum text-fey-white outline-none"
                        />
                        <span className="text-xs text-fey-graphite">%</span>
                      </div>
                      {slipError ? (
                        <p className="mt-1.5 text-xs text-fey-ember">{slipError}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-fey-graphite">
                          Allowed range: 0.1% to 50.0%.
                        </p>
                      )}
                    </div>

                    {/* Back Up Key / Export Wallet */}
                    <div className="mt-4 pt-4 border-t border-fey-smoke space-y-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsOpen(false);
                          setActiveModal("export-key");
                        }}
                        className="flex w-full h-10 items-center justify-between rounded-pill bg-fey-obsidian border border-fey-smoke px-4 text-xs font-medium text-fey-white hover:border-fey-pale transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <KeyRound className="size-3.5 text-fey-signal" />
                          <span>Back up key (Export Wallet)</span>
                        </span>
                        <ArrowUpRight className="size-3.5 text-fey-graphite" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDisconnectWallet()}
                        className="flex w-full h-10 items-center justify-center gap-2 rounded-pill bg-fey-obsidian border border-fey-ember px-4 text-xs font-medium text-fey-ember hover:bg-fey-ember/10 transition-colors"
                      >
                        <LogOut className="size-3.5" />
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container — safe bottom padding so fixed bottom nav never obscures content */}
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-6 pb-24 overflow-x-hidden box-border">
        {children}
      </div>

      {/* Footer — with generous bottom padding so the fixed bottom nav never overlaps links */}
      <footer className="w-full max-w-full border-t border-fey-smoke bg-fey-ink pt-8 pb-28 mt-12 overflow-x-hidden box-border">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 box-border">
          <div className="flex flex-wrap items-center gap-6 text-body text-fey-graphite">
            <span className="inline-flex items-center gap-2 font-semibold text-fey-white">
              <img
                src={LOGO_SRC}
                alt="Moxie Markets logo"
                referrerPolicy="no-referrer"
                className="size-5 rounded-icon object-cover"
              />
              <span>Moxie Markets</span>
            </span>
            <Link to="/terms" className="hover:text-fey-white transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-fey-white transition-colors">
              Privacy
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="mailto:moxiedotmarkets@gmail.com"
              className="inline-flex items-center gap-2 rounded-pill bg-fey-charcoal border border-fey-smoke px-3.5 py-1.5 text-xs text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors"
            >
              <Mail className="size-3.5 text-fey-signal shrink-0" />
              <span className="truncate">moxiedotmarkets@gmail.com</span>
            </a>
            <a
              href="https://x.com/moxiedotmarkets"
              target="_blank"
              rel="noreferrer"
              aria-label="Moxie Markets on X"
              className="inline-flex items-center gap-2 rounded-pill bg-fey-charcoal border border-fey-smoke px-3.5 py-1.5 text-xs text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors"
            >
              <span className="font-bold text-fey-white">𝕏</span>
              <span>@moxiedotmarkets</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Persistent Fixed Bottom Navigation Bar (fixed bottom-0 left-0 right-0 z-50 on mobile, floating pill on desktop) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-full overflow-hidden box-border flex justify-center bg-fey-charcoal/95 border-t border-fey-smoke px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md md:bottom-4 md:bg-transparent md:border-t-0 md:px-4 md:py-0 md:pb-0 md:pointer-events-none">
        <nav
          aria-label="Bottom Navigation"
          className="pointer-events-auto flex items-center justify-between md:justify-center gap-1 sm:gap-1.5 w-full max-w-md md:w-auto max-w-full overflow-hidden box-border rounded-pill md:bg-fey-charcoal/95 md:border md:border-fey-smoke px-1 md:px-3 py-0.5 md:py-1.5 md:shadow-[0px_8px_32px_0px_rgba(0,0,0,0.35)] md:backdrop-blur-md"
        >
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-1 md:flex-initial items-center justify-center gap-1.5 sm:gap-2 rounded-pill px-2.5 sm:px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap min-w-0 ${
                  isActive ? "text-fey-white" : "text-fey-graphite hover:text-fey-mist"
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="dock-liquid"
                    initial={false}
                    transition={SPRING}
                    className="absolute inset-0 rounded-pill bg-fey-obsidian border border-fey-smoke"
                  />
                ) : null}
                <Icon className="relative z-10 size-4 stroke-[1.75] shrink-0" />
                <span className="relative z-10 truncate">{item.label}</span>
              </Link>
            );
          })}

          <div className="h-4 w-px bg-fey-smoke mx-0.5 sm:mx-1 shrink-0" />

          <button
            type="button"
            onClick={() => {
              sfx.tap();
              setActiveModal("cmdk");
            }}
            aria-label="Search markets"
            className="flex items-center justify-center gap-1.5 rounded-pill bg-fey-obsidian border border-fey-smoke px-3 py-2 text-xs font-medium text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="size-4 stroke-[1.75] shrink-0" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline-block rounded bg-fey-charcoal px-1.5 py-0.5 text-[10px] text-fey-graphite border border-fey-smoke">
              ⌘K
            </kbd>
          </button>
        </nav>
      </div>

      <CookieBanner />

      {/* Global Modals */}
      <AnimatePresence>
        {activeModal === "connect" ? (
          <AuthModal
            key="modal-connect"
            onClose={() => setActiveModal(null)}
            activeSolanaKey={activeSolanaKey}
            derivedPolygon={derivedPolygon}
            connectLabel={connectLabel}
          />
        ) : null}

        {activeModal === "deposit" ? (
          <DepositModal
            key="modal-deposit"
            onClose={() => setActiveModal(null)}
            solanaAddress={activeSolanaKey}
          />
        ) : null}

        {activeModal === "withdraw" ? (
          <WithdrawModal
            key="modal-withdraw"
            onClose={() => setActiveModal(null)}
            solanaAddress={activeSolanaKey}
            availableMicro={available}
          />
        ) : null}

        {activeModal === "export-key" ? (
          <ExportKeyModal
            key="modal-export"
            onClose={() => setActiveModal(null)}
            solanaAddress={activeSolanaKey}
            derivedPolygon={derivedPolygon}
          />
        ) : null}

        {activeModal === "cmdk" ? (
          <CommandSearchModal
            key="modal-cmdk"
            onClose={() => setActiveModal(null)}
            onSelectMarket={(marketId) => {
              setActiveModal(null);
              void navigate({ to: "/trade/$marketId", params: { marketId } });
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ModalBackdrop({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-fey-ink/80 p-4 backdrop-blur-sm overflow-x-hidden box-border"
    >
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 z-0"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={SPRING}
        className="fey-card relative z-10 w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden box-border"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-fey-smoke">
          <div className="min-w-0">
            <h2 className="text-heading text-fey-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-fey-graphite">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-fey-obsidian border border-fey-smoke text-fey-mist hover:text-fey-white"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function AuthModal({
  onClose,
  activeSolanaKey,
  derivedPolygon,
  connectLabel,
}: {
  onClose: () => void;
  activeSolanaKey: string;
  derivedPolygon: string;
  connectLabel: string | null;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const connect = useDesk((s) => s.connect);

  function handleSocialLogin(method: "Google" | "X") {
    sfx.tap();
    connect(method, null);
    toast(`Signed in with ${method}. Embedded Solana wallet ready.`);
    onClose();
  }

  function handleEmailSignIn() {
    sfx.tap();
    const trimmed = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    connect(trimmed, null);
    toast(`Signed in as ${trimmed}.`);
    onClose();
  }

  async function handleExternalWallet(wallet: (typeof EXTERNAL_WALLETS)[number]) {
    sfx.tap();
    const provider = injectedProvider(wallet.id);
    if (provider) {
      try {
        const res = await provider.connect();
        const owner = res.publicKey.toString();
        await readDevnetBalance(owner).catch(() => null);
        connect(wallet.label, owner);
        toast(`${wallet.label} connected on Solana Devnet.`);
        onClose();
        return;
      } catch (err) {
        toast(err instanceof Error ? err.message : "Wallet connection cancelled.");
        return;
      }
    }

    connect(wallet.label, null);
    toast(`${wallet.label} connected.`);
    onClose();
  }

  function handleMobileWallet() {
    sfx.tap();
    const isPhone = /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isPhone) {
      openMobileWallet();
      return;
    }
    connect("Mobile Wallet", null);
    toast("Mobile wallet connected.");
    onClose();
  }

  return (
    <ModalBackdrop
      title="Log in or Sign up."
      subtitle="Sign in with Google, X, or Email, or connect your Solana wallet."
      onClose={onClose}
    >
      {/* Social & Email Sign-in */}
      <div className="space-y-3">
        <p className="text-caption text-fey-graphite">Quick Sign In (Creates Embedded Solana Wallet)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleSocialLogin("Google")}
            className="flex h-11 items-center justify-center gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 text-xs font-medium text-fey-white hover:border-fey-pale transition-colors"
          >
            <span>Continue with Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin("X")}
            className="flex h-11 items-center justify-center gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 text-xs font-medium text-fey-white hover:border-fey-pale transition-colors"
          >
            <span className="font-bold">𝕏</span>
            <span>Continue with X</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => {
              setEmailError(null);
              setEmailInput(e.target.value);
            }}
            placeholder="Enter your email address..."
            aria-label="Email address"
            className="h-11 w-full max-w-full flex-1 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 text-body text-fey-white outline-none focus:border-fey-signal box-border"
          />
          <button
            type="button"
            onClick={handleEmailSignIn}
            className="ghost-pill-cta h-11 px-5 text-xs font-medium shrink-0"
          >
            Continue
          </button>
        </div>
        {emailError ? <p className="text-xs text-fey-ember">{emailError}</p> : null}
      </div>

      {/* External Solana Wallets */}
      <div className="mt-5 pt-4 border-t border-fey-smoke space-y-2.5">
        <p className="text-caption text-fey-graphite">External Solana Wallets</p>
        {EXTERNAL_WALLETS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => void handleExternalWallet(w)}
            className="flex w-full items-center justify-between gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 py-2.5 text-left hover:border-fey-pale transition-colors"
          >
            <div className="min-w-0">
              <span className="block text-body font-medium text-fey-white">{w.label}</span>
              <span className="block text-xs text-fey-graphite truncate">{w.subtitle}</span>
            </div>
            <span className="rounded-pill bg-fey-charcoal border border-fey-smoke px-2.5 py-1 text-[11px] text-fey-signal shrink-0">
              Connect
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={handleMobileWallet}
          className="flex w-full items-center justify-between gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 py-2.5 text-left hover:border-fey-pale transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Smartphone className="size-4 text-fey-signal shrink-0" />
            <div className="min-w-0">
              <span className="block text-body font-medium text-fey-white">Mobile Wallet Adapter</span>
              <span className="block text-xs text-fey-graphite truncate">
                Phantom, Solflare &amp; Backpack on mobile
              </span>
            </div>
          </div>
          <span className="rounded-pill bg-fey-charcoal border border-fey-smoke px-2.5 py-1 text-[11px] text-fey-mist shrink-0">
            Mobile
          </span>
        </button>
      </div>

      <div className="fey-well mt-5 p-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-fey-graphite">Status</span>
          <span className="tnum text-fey-white">{connectLabel ?? "Not signed in"}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-fey-graphite">Solana Address</span>
          <span className="tnum text-fey-mist">{shortKey(activeSolanaKey, 6, 4)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-fey-graphite">Derived Polygon Address</span>
          <span className="tnum text-fey-growth">{shortHex(derivedPolygon, 6, 4)}</span>
        </div>
      </div>
    </ModalBackdrop>
  );
}

function DepositModal({
  onClose,
  solanaAddress,
}: {
  onClose: () => void;
  solanaAddress: string;
}) {
  const [copied, setCopied] = useState(false);
  const [minting, setMinting] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);
  const available = useDesk((s) => s.available);
  const mintTestUsdc = useDesk((s) => s.mintTestUsdc);

  // Deterministic 11x11 QR matrix from Solana address bytes
  const qrCells = useMemo(() => {
    const cells: boolean[] = [];
    for (let r = 0; r < 11; r += 1) {
      for (let c = 0; c < 11; c += 1) {
        const isCorner =
          (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3);
        if (isCorner) {
          cells.push(true);
        } else {
          const code = solanaAddress.charCodeAt((r * 11 + c) % solanaAddress.length) || 65;
          cells.push((code + r * 3 + c * 7) % 2 === 0);
        }
      }
    }
    return cells;
  }, [solanaAddress]);

  function copyAddress() {
    void navigator.clipboard?.writeText(solanaAddress);
    setCopied(true);
    toast("Solana USDC address copied.");
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleMintTestUsdc() {
    sfx.tap();
    setMinting(true);
    setFaucetMessage(null);
    try {
      const res = await fetch("/api/faucet/usdc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipient: solanaAddress, amountUsdc: 100 }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        signature?: string;
        amountUsdc?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setFaucetMessage(data.error ?? "Could not mint Devnet Test USDC.");
        toast(data.error ?? "Could not mint Devnet Test USDC.");
        return;
      }
      sfx.bought();
      mintTestUsdc((data.amountUsdc ?? 100) * 1_000_000);
      setFaucetMessage(
        `Minted $${data.amountUsdc ?? 100} Test USDC (${shortKey(data.signature ?? "", 6, 4)}).`,
      );
      toast(`Minted $${data.amountUsdc ?? 100} Test USDC.`);
    } catch (err) {
      setFaucetMessage(err instanceof Error ? err.message : "Failed to reach USDC faucet.");
    } finally {
      setMinting(false);
    }
  }

  return (
    <ModalBackdrop
      title="Deposit USDC (Add cash)."
      subtitle="Send Solana USDC to your wallet address below."
      onClose={onClose}
    >
      <div className="flex flex-col items-center">
        {/* QR Code Box */}
        <div className="fey-well p-4 flex flex-col items-center">
          <svg
            viewBox="0 0 110 110"
            className="size-36 rounded-icon bg-fey-white p-2"
            role="img"
            aria-label={`QR code for Solana address ${solanaAddress}`}
          >
            {qrCells.map((filled, idx) => {
              const r = Math.floor(idx / 11);
              const c = idx % 11;
              return filled ? (
                <rect
                  key={idx}
                  x={c * 10 + 1}
                  y={r * 10 + 1}
                  width={8}
                  height={8}
                  rx={1.5}
                  fill="#0b0b0b"
                />
              ) : null;
            })}
          </svg>
          <span className="mt-2 text-caption text-fey-graphite">Solana Devnet USDC</span>
        </div>

        {/* Copy Address Pill */}
        <div className="mt-4 flex w-full items-center justify-between gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 py-2.5 box-border">
          <span className="tnum text-xs text-fey-white truncate">{solanaAddress}</span>
          <button
            type="button"
            onClick={copyAddress}
            className="inline-flex items-center gap-1.5 rounded-pill bg-fey-charcoal border border-fey-smoke px-3 py-1 text-xs font-medium text-fey-white hover:border-fey-pale shrink-0"
          >
            {copied ? (
              <Check className="size-3.5 text-fey-growth" />
            ) : (
              <Copy className="size-3.5 text-fey-mist" />
            )}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className="fey-well mt-4 w-full p-3.5 flex items-center justify-between text-xs box-border">
          <span className="text-fey-graphite">Available Balance</span>
          <span className="tnum font-semibold text-fey-growth">${formatUsdc(available)} USDC</span>
        </div>

        {faucetMessage ? (
          <p className="mt-3 w-full rounded-well bg-fey-obsidian border border-fey-smoke px-3.5 py-2 text-xs text-fey-mist">
            {faucetMessage}
          </p>
        ) : null}

        <button
          type="button"
          disabled={minting}
          onClick={() => void handleMintTestUsdc()}
          className="ghost-pill-cta mt-4 flex h-11 w-full items-center justify-center gap-2 text-body font-medium disabled:opacity-50"
        >
          <Sparkles className="size-4 text-fey-ember" />
          <span>{minting ? "Minting on Devnet…" : "Mint Test USDC"}</span>
        </button>
      </div>
    </ModalBackdrop>
  );
}

function WithdrawModal({
  onClose,
  solanaAddress,
  availableMicro,
}: {
  onClose: () => void;
  solanaAddress: string;
  availableMicro: number;
}) {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const withdrawUsdc = useDesk((s) => s.withdrawUsdc);

  function setPercentage(pct: number) {
    sfx.tap();
    setError(null);
    const targetMicro = Math.floor((availableMicro * pct) / 100);
    const dollars = (targetMicro / 1_000_000).toFixed(2);
    setAmount(dollars);
  }

  async function handleWithdraw() {
    setError(null);
    if (!isValidSolanaAddress(destination)) {
      setError("Enter a valid Solana address (32 to 44 base58 characters).");
      return;
    }
    const micro = parseUsdc(amount);
    if (micro === null || micro <= 0) {
      setError("Enter a valid USDC amount between $0.01 and $5,000.");
      return;
    }
    if (micro > availableMicro) {
      setError("Amount exceeds your available Solana USDC balance.");
      return;
    }

    setSending(true);
    try {
      await buildWithdrawUsdcTransaction({
        sender: solanaAddress,
        recipient: destination.trim(),
        amountMicro: micro,
      });
      withdrawUsdc(micro);
      sfx.bought();
      toast(`Sent $${formatUsdc(micro)} USDC to ${shortKey(destination.trim(), 4, 4)}.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete withdrawal.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ModalBackdrop
      title="Withdraw USDC (Cash out)."
      subtitle="Transfer USDC from your Solana balance to any external Solana address."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <label className="text-caption text-fey-graphite block" htmlFor="withdraw-dest">
            Destination Solana Address
          </label>
          <input
            id="withdraw-dest"
            type="text"
            value={destination}
            onChange={(e) => {
              setError(null);
              setDestination(e.target.value);
            }}
            placeholder="Paste Solana address (e.g. 56UdLRmQv...)"
            className="mt-2 h-11 w-full max-w-full rounded-pill bg-fey-obsidian border border-fey-smoke px-4 text-body tnum text-fey-white outline-none focus:border-fey-signal box-border"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-caption text-fey-graphite" htmlFor="withdraw-amount">
              Amount (USDC)
            </label>
            <span className="tnum text-xs text-fey-mist">
              Available: ${formatUsdc(availableMicro)}
            </span>
          </div>

          <input
            id="withdraw-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setError(null);
              setAmount(e.target.value);
            }}
            placeholder="0.00"
            className="mt-2 h-11 w-full max-w-full rounded-pill bg-fey-obsidian border border-fey-smoke px-4 text-body tnum text-fey-white outline-none focus:border-fey-signal box-border"
          />

          <div className="mt-2.5 flex gap-2">
            {[
              { label: "25%", pct: 25 },
              { label: "50%", pct: 50 },
              { label: "Max", pct: 100 },
            ].map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => setPercentage(pill.pct)}
                className="h-9 flex-1 rounded-pill bg-fey-obsidian border border-fey-smoke text-xs font-medium tnum text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors"
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-well bg-fey-obsidian border border-fey-ember/60 px-3.5 py-2.5 text-xs text-fey-ember">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={sending}
          onClick={() => void handleWithdraw()}
          className="ghost-pill-cta flex h-11 w-full items-center justify-center gap-2 text-body font-medium disabled:opacity-50"
        >
          <ArrowUpRight className="size-4 text-fey-ember" />
          <span>{sending ? "Sending Transfer…" : "Cash out USDC"}</span>
        </button>
      </div>
    </ModalBackdrop>
  );
}

function ExportKeyModal({
  onClose,
  solanaAddress,
  derivedPolygon,
}: {
  onClose: () => void;
  solanaAddress: string;
  derivedPolygon: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const secretKeyHex = useDesk((s) => s.secretKeyHex);

  return (
    <ModalBackdrop
      title="Back up key."
      subtitle="Keep your recovery key in a safe place. Anyone with this key can move your funds."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="fey-well p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-fey-graphite">Solana Public Key</span>
            <span className="tnum text-fey-white">{shortKey(solanaAddress, 6, 6)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-fey-graphite">Derived Polygon Address</span>
            <span className="tnum text-fey-signal">{shortHex(derivedPolygon, 6, 4)}</span>
          </div>
        </div>

        <div className="fey-well p-4">
          <p className="text-caption text-fey-graphite">Solana Key Material (Hex)</p>
          <p className="mt-2 break-all tnum text-xs text-fey-white">
            {revealed ? secretKeyHex : "•".repeat(64)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="h-10 flex-1 rounded-pill bg-fey-obsidian border border-fey-smoke text-xs font-medium text-fey-white hover:border-fey-pale"
          >
            {revealed ? "Hide Key" : "Reveal Key"}
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(secretKeyHex);
              toast("Key copied to clipboard.");
            }}
            className="ghost-pill-cta h-10 flex-1 text-xs font-medium"
          >
            Copy Key
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

function CommandSearchModal({
  onClose,
  onSelectMarket,
}: {
  onClose: () => void;
  onSelectMarket: (marketId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MARKETS;
    return MARKETS.filter(
      (m) =>
        m.question.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.venue.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <ModalBackdrop title="Search Markets." subtitle="Jump directly to any market." onClose={onClose}>
      <div className="space-y-3 w-full max-w-full box-border">
        <div className="flex items-center gap-2 w-full max-w-full box-border rounded-pill bg-fey-obsidian border border-fey-smoke px-4 py-2.5">
          <Search className="size-4 text-fey-graphite shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search politics, crypto, sports, tech..."
            className="w-full max-w-full bg-transparent text-body text-fey-white outline-none box-border"
          />
        </div>

        <ul className="max-h-72 overflow-y-auto divide-y divide-fey-smoke/50">
          {filtered.map((m) => {
            const yesPct = Math.round(m.yesAskMicro / 10_000);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelectMarket(m.id)}
                  className="flex w-full items-center justify-between gap-3 py-3 px-2 text-left hover:bg-fey-obsidian rounded-well transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-caption text-fey-signal">{m.category}</span>
                    <span className="block truncate text-body font-medium text-fey-white">
                      {m.question}
                    </span>
                  </div>
                  <span className="tnum text-heading-sm font-bold text-fey-growth shrink-0">
                    {yesPct}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </ModalBackdrop>
  );
}

function CookieBanner() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(window.localStorage.getItem("moxie-cookie") !== "1");
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-card border border-fey-smoke bg-fey-charcoal px-4 py-3 text-xs text-fey-mist shadow-[0px_0px_44px_0px_rgba(0,0,0,0.8)] box-border">
      <span>Moxie Markets stores your session locally in your browser.</span>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem("moxie-cookie", "1");
          setOpen(false);
        }}
        className="ghost-pill-cta h-8 px-3.5 text-xs font-medium shrink-0"
      >
        Got it
      </button>
    </div>
  );
}
