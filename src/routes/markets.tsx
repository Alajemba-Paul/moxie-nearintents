import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
  complementAsk,
  MARKET_CATEGORIES,
  MARKETS,
  type Market,
  type MarketCategory,
} from "@/lib/moxie/markets";
import { sfx } from "@/lib/moxie/sound";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Markets · Moxie Markets" },
      {
        name: "description",
        content:
          "Discover live Polymarket events. Filter by category, view live probabilities, and trade privately with Solana USDC.",
      },
    ],
  }),
  component: MarketsTerminal,
});

const SPRING = { type: "spring" as const, stiffness: 300, damping: 28, mass: 0.8 };

function MarketsTerminal() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<MarketCategory>("All");
  const [query, setQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>(MARKETS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const controller = new AbortController();

    async function load() {
      try {
        const params = new URLSearchParams();
        if (category !== "All") params.set("category", category);
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch(`/api/polymarket/markets?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load markets");
        const data = (await res.json()) as { markets: Market[]; source: string };
        if (!cancelled) {
          setMarkets(data.markets);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          const q = query.trim().toLowerCase();
          const filtered = MARKETS.filter((m) => {
            const catMatch = category === "All" || m.category === category;
            const qMatch =
              !q ||
              m.question.toLowerCase().includes(q) ||
              m.category.toLowerCase().includes(q) ||
              m.venue.toLowerCase().includes(q);
            return catMatch && qMatch;
          });
          setMarkets(filtered);
          setLoading(false);
        }
      }
    }

    const debounce = setTimeout(() => {
      void load();
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
      controller.abort();
    };
  }, [category, query]);

  return (
    <main className="py-10 space-y-10 w-full max-w-full overflow-x-hidden box-border">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between w-full max-w-full box-border">
        <div className="min-w-0">
          <p className="text-caption text-fey-graphite">Market Discovery</p>
          <h1 className="mt-2 text-display-lg text-fey-white">
            Pick your market <span className="text-fey-signal">privately.</span>
          </h1>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2.5 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 py-2.5 w-full max-w-full md:w-80 box-border overflow-hidden focus-within:border-fey-signal transition-colors">
          <Search className="size-4 text-fey-graphite shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, topics, tickers..."
            aria-label="Search markets"
            className="w-full max-w-full min-w-0 bg-transparent text-body text-fey-white outline-none placeholder:text-fey-graphite box-border"
          />
        </div>
      </header>

      {/* Category Pills with Liquid Active Underline (#479ffa) */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-fey-smoke"
        role="tablist"
        aria-label="Market categories"
      >
        {MARKET_CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                sfx.tap();
                setCategory(cat);
              }}
              className={`relative rounded-pill px-4 py-2 text-body font-medium whitespace-nowrap shrink-0 transition-colors ${
                active ? "text-fey-white" : "text-fey-graphite hover:text-fey-mist"
              }`}
            >
              <span>{cat}</span>
              {active ? (
                <motion.span
                  layoutId="category-underline"
                  initial={false}
                  transition={SPRING}
                  className="absolute inset-x-3 -bottom-2 h-0.5 rounded-pill bg-fey-signal"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Loading Skeletons (#191919 pulse) or 3-Up Market Grid */}
      {loading ? (
        <div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading markets"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="fey-card h-64 p-5 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-3 w-28 rounded-pill bg-fey-obsidian" />
                <div className="h-5 w-full rounded-pill bg-fey-obsidian" />
                <div className="h-5 w-3/4 rounded-pill bg-fey-obsidian" />
              </div>
              <div className="space-y-3">
                <div className="h-10 w-24 rounded-pill bg-fey-obsidian" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-10 rounded-pill bg-fey-obsidian" />
                  <div className="h-10 rounded-pill bg-fey-obsidian" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="fey-card p-10 text-center space-y-4">
          <p className="text-heading-sm text-fey-white">No markets match your filter.</p>
          <p className="text-body text-fey-graphite">
            Try clearing your search or switching back to All categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory("All");
              setQuery("");
            }}
            className="ghost-pill-cta h-10 px-5 text-xs font-medium"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => {
            const yesPct = Math.round(market.yesAskMicro / 10_000);
            const noMicro = complementAsk(market.yesAskMicro);
            const noPct = Math.round(noMicro / 10_000);
            return (
              <motion.article
                key={market.id}
                initial={false}
                transition={SPRING}
                className="fey-card p-5 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-caption text-fey-graphite">
                    <span className="text-fey-signal">{market.category}</span>
                    <span className="tnum">24h Vol {market.volume}</span>
                  </div>

                  <Link
                    to="/trade/$marketId"
                    params={{ marketId: market.id }}
                    className="group flex items-start justify-between gap-2 text-heading-sm text-fey-white hover:text-fey-signal transition-colors"
                  >
                    <span>{market.question}</span>
                    <ArrowUpRight className="size-4 shrink-0 text-fey-graphite group-hover:text-fey-signal transition-colors mt-1" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {/* 48px Probability Readout + Liquid Bar */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="tnum text-display text-fey-white">{yesPct}%</span>
                        <span className="ml-2 text-caption text-fey-growth">YES</span>
                      </div>
                      <span className="text-xs text-fey-graphite">Ends {market.resolves}</span>
                    </div>

                    <div className="mt-2.5 flex h-1.5 w-full overflow-hidden rounded-pill bg-fey-obsidian">
                      <motion.div
                        className="h-full bg-fey-growth"
                        initial={false}
                        animate={{ width: `${yesPct}%` }}
                        transition={SPRING}
                      />
                      <div className="h-full flex-1 bg-fey-ember" />
                    </div>
                  </div>

                  {/* YES (#4ebe96) and NO (#ffa16c) Quick-Trade Pills */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        sfx.tap();
                        void navigate({
                          to: "/trade/$marketId",
                          params: { marketId: market.id },
                          search: { side: "yes" },
                        });
                      }}
                      className="flex h-10 items-center justify-between rounded-pill bg-fey-obsidian border border-fey-growth/60 px-3.5 text-xs font-medium text-fey-growth hover:bg-fey-growth/15 transition-colors"
                    >
                      <span>Trade YES</span>
                      <span className="tnum">{yesPct}¢</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sfx.tap();
                        void navigate({
                          to: "/trade/$marketId",
                          params: { marketId: market.id },
                          search: { side: "no" },
                        });
                      }}
                      className="flex h-10 items-center justify-between rounded-pill bg-fey-obsidian border border-fey-ember/60 px-3.5 text-xs font-medium text-fey-ember hover:bg-fey-ember/15 transition-colors"
                    >
                      <span>Trade NO</span>
                      <span className="tnum">{noPct}¢</span>
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </main>
  );
}
