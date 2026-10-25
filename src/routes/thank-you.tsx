import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Share2 } from "lucide-react";

export const Route = createFileRoute("/thank-you")({
  validateSearch: (search: Record<string, unknown>): { market?: string; side?: "yes" | "no"; amount?: string } => {
    const rawAmount = typeof search.amount === "string" ? search.amount.replaceAll('"', "") : undefined;
    return {
      market: typeof search.market === "string" ? search.market : undefined,
      side: search.side === "no" ? "no" : search.side === "yes" ? "yes" : undefined,
      amount: rawAmount,
    };
  },
  head: () => ({
    meta: [
      { title: "Trade Settled · Moxie Markets" },
      { name: "description", content: "Your private Moxie Markets trade settled. View and share your receipt." },
    ],
  }),
  component: ThankYou,
});

function ThankYou() {
  const search = Route.useSearch();
  const market = search?.market ?? "your market";
  const side = search?.side ?? "yes";
  const amount = search?.amount ?? "";
  const text = `I just traded ${side.toUpperCase()} on "${market}"${amount ? ` for $${amount} USDC` : ""} privately on @moxiedotmarkets.`;
  const share = encodeURIComponent(text);

  return (
    <main className="mx-auto max-w-xl py-14 space-y-6">
      <div className="fey-card p-6 space-y-5">
        <div className="inline-flex items-center gap-2 rounded-pill bg-fey-obsidian border border-fey-growth/60 px-3.5 py-1 text-caption text-fey-growth">
          <CheckCircle2 className="size-3.5" />
          <span>TRADE SETTLED</span>
        </div>

        <h1 className="text-display text-fey-white">
          Your trade is <span className="text-fey-growth">settled.</span>
        </h1>

        <div className="fey-well p-4 space-y-2">
          <p className="text-heading-sm text-fey-white">{market}</p>
          <p className="tnum text-display text-fey-ember">
            {side.toUpperCase()}
            {amount ? ` · $${amount} USDC` : ""}
          </p>
          <p className="text-body text-fey-mist">
            You keep full control of your wallet. Your shares sit in the Polygon address derived automatically from your Solana key.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            className="ghost-pill-cta inline-flex h-11 items-center gap-2 px-5 text-body font-medium"
            href={`https://x.com/intent/tweet?text=${share}`}
            target="_blank"
            rel="noreferrer"
          >
            <Share2 className="size-4 text-fey-signal" />
            <span>Share on X</span>
          </a>

          <Link
            to="/portfolio"
            className="inline-flex h-11 items-center rounded-pill bg-fey-obsidian border border-fey-smoke px-5 text-body font-medium text-fey-white hover:border-fey-pale"
          >
            View Portfolio
          </Link>

          <Link
            to="/markets"
            className="inline-flex h-11 items-center rounded-pill bg-fey-obsidian border border-fey-smoke px-5 text-body font-medium text-fey-mist hover:text-fey-white"
          >
            Back to Markets
          </Link>
        </div>
      </div>
    </main>
  );
}
