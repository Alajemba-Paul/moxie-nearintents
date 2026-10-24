import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Lock, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { formatCents } from "@/lib/moxie/format";
import { complementAsk, MARKETS } from "@/lib/moxie/markets";
import { sfx } from "@/lib/moxie/sound";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Moxie Markets · Trade on global events privately." },
      {
        name: "description",
        content: "Trade live Polymarket outcomes privately on Solana in one click.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    step: "01",
    title: "Sign up / Log in",
    body: "Connect your Solana wallet or sign in with Google, X, or Email. Moxie Markets derives your Polygon address automatically.",
    icon: Wallet,
  },
  {
    step: "02",
    title: "Fund your wallet",
    body: "Deposit USDC on Solana in one click.",
    icon: Lock,
  },
  {
    step: "03",
    title: "Private Routing via NEAR",
    body: "Your trade routes privately through Aurora Intents Connect and NEAR Intents so bots cannot copy or front-run your order.",
    icon: ShieldCheck,
  },
] as const;

function LandingPage() {
  const navigate = useNavigate();
  const [showcaseIndex, setShowcaseIndex] = useState(0);

  const showcaseMarket = MARKETS[showcaseIndex] ?? MARKETS[0]!;
  const yesPct = Math.round(showcaseMarket.yesAskMicro / 10_000);
  const noMicro = complementAsk(showcaseMarket.yesAskMicro);
  const noPct = Math.round(noMicro / 10_000);

  return (
    <main className="py-12 sm:py-16 space-y-16">
      {/* Hero Section (Above the Fold) */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <h1 className="text-display-lg text-fey-white">
            Trade on global events <span className="text-fey-ember">privately.</span>
          </h1>

          <p className="max-w-xl text-heading-sm font-normal text-fey-mist">
            Trade live Polymarket outcomes privately on Solana in one click.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/markets"
              onClick={() => sfx.tap()}
              className="ghost-pill-cta inline-flex items-center gap-3 px-8 py-4 text-lg font-medium"
            >
              <span>Open Terminal</span>
              <ArrowRight className="size-5 text-fey-ember" />
            </Link>
          </div>
        </div>

        {/* Floating #191919 Product Showcase Card (16px radius, 44px black shadow halo) */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.8 }}
          className="fey-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-fey-smoke">
            <div className="flex items-center gap-2">
              <span className="text-caption text-fey-signal">{showcaseMarket.category}</span>
              <span className="text-fey-graphite">·</span>
              <span className="text-caption text-fey-graphite">{showcaseMarket.venue}</span>
            </div>
            <div className="flex items-center gap-1">
              {MARKETS.slice(0, 3).map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setShowcaseIndex(idx);
                  }}
                  className={`h-6 rounded-pill px-2.5 text-[11px] font-medium transition-colors ${
                    showcaseIndex === idx
                      ? "bg-fey-obsidian border border-fey-signal text-fey-white"
                      : "text-fey-graphite hover:text-fey-mist"
                  }`}
                >
                  #{idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-heading text-fey-white">{showcaseMarket.question}</h2>
            <div className="text-right shrink-0">
              <span className="tnum text-display text-fey-growth">{yesPct}%</span>
              <span className="block text-caption text-fey-graphite">YES CHANCE</span>
            </div>
          </div>

          {/* Liquid Orderbook Depth Preview */}
          <div className="fey-well p-3.5 space-y-2">
            <div className="flex items-center justify-between text-caption text-fey-graphite">
              <span>Live Orderbook Depth</span>
              <span className="tnum">24h Vol {showcaseMarket.volume}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-pill bg-fey-charcoal flex">
              <motion.div
                className="h-full bg-fey-growth"
                initial={false}
                animate={{ width: `${yesPct}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.8 }}
              />
              <div className="h-full flex-1 bg-fey-ember" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/trade/$marketId",
                    params: { marketId: showcaseMarket.id },
                    search: { side: "yes" },
                  })
                }
                className="flex items-center justify-between rounded-pill bg-fey-charcoal border border-fey-growth/50 px-3.5 py-2 text-xs font-medium text-fey-white hover:border-fey-growth transition-colors"
              >
                <span className="text-fey-growth">Trade YES</span>
                <span className="tnum">{formatCents(showcaseMarket.yesAskMicro)}¢</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/trade/$marketId",
                    params: { marketId: showcaseMarket.id },
                    search: { side: "no" },
                  })
                }
                className="flex items-center justify-between rounded-pill bg-fey-charcoal border border-fey-ember/50 px-3.5 py-2 text-xs font-medium text-fey-white hover:border-fey-ember transition-colors"
              >
                <span className="text-fey-ember">Trade NO</span>
                <span className="tnum">{noPct}.0¢</span>
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3-Up Feature Cards */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-caption text-fey-graphite">How Moxie Markets Works</p>
            <h2 className="mt-1 text-display text-fey-white">
              One click from Solana to <span className="text-fey-signal">Polymarket.</span>
            </h2>
          </div>
          <Link
            to="/markets"
            className="text-body font-medium text-fey-signal hover:underline inline-flex items-center gap-1.5"
          >
            <span>Browse all live markets</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <article key={feat.title} className="fey-card p-5 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-9 items-center justify-center rounded-icon bg-fey-obsidian border border-fey-smoke text-fey-signal">
                      <Icon className="size-4" />
                    </span>
                    <span className="tnum text-caption text-fey-graphite">{feat.step}</span>
                  </div>
                  <h3 className="text-heading-sm text-fey-white">{feat.title}</h3>
                  <p className="text-body text-fey-mist">{feat.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Featured Markets Preview */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-caption text-fey-graphite">Live Orderbooks</p>
            <h2 className="mt-1 text-heading-lg text-fey-white">
              Top active markets right <span className="text-fey-ember">now.</span>
            </h2>
          </div>
          <Link
            to="/markets"
            className="ghost-pill-cta inline-flex h-10 items-center gap-2 px-4 text-xs font-medium"
          >
            <span>Open Full Discovery</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {MARKETS.slice(0, 3).map((market) => {
            const yes = Math.round(market.yesAskMicro / 10_000);
            const no = 100 - yes;
            return (
              <article key={market.id} className="fey-card p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between text-caption text-fey-graphite">
                    <span className="text-fey-signal">{market.category}</span>
                    <span className="tnum">24h {market.volume}</span>
                  </div>
                  <Link
                    to="/trade/$marketId"
                    params={{ marketId: market.id }}
                    className="mt-2.5 block text-heading-sm text-fey-white hover:text-fey-signal transition-colors"
                  >
                    {market.question}
                  </Link>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="tnum text-display text-fey-white">{yes}%</span>
                    <span className="text-xs text-fey-graphite">Resolves {market.resolves}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/trade/$marketId"
                      params={{ marketId: market.id }}
                      search={{ side: "yes" }}
                      className="flex h-10 items-center justify-between rounded-pill bg-fey-obsidian border border-fey-growth/60 px-3.5 text-xs font-medium text-fey-growth hover:bg-fey-growth/10 transition-colors"
                    >
                      <span>Trade YES</span>
                      <span className="tnum">{yes}¢</span>
                    </Link>
                    <Link
                      to="/trade/$marketId"
                      params={{ marketId: market.id }}
                      search={{ side: "no" }}
                      className="flex h-10 items-center justify-between rounded-pill bg-fey-obsidian border border-fey-ember/60 px-3.5 text-xs font-medium text-fey-ember hover:bg-fey-ember/10 transition-colors"
                    >
                      <span>Trade NO</span>
                      <span className="tnum">{no}¢</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}