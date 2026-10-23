import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/thank-you")({
  validateSearch: (search: Record<string, unknown>) => {
    const rawAmount = typeof search.amount === "string" ? search.amount : "";
    return {
      market: typeof search.market === "string" ? search.market : "your market",
      side: search.side === "no" ? "no" : "yes",
      amount: rawAmount.replaceAll('"', ""),
    };
  },
  head: () => ({
    meta: [
      { title: "Filled · Moxie" },
      { name: "description", content: "Your Moxie intent settled. Share the receipt." },
    ],
  }),
  component: ThankYou,
});

function ThankYou() {
  const { market, side, amount } = Route.useSearch();
  const text = `I just filled ${side.toUpperCase()} on “${market}”${amount ? ` for $${amount}` : ""} via Moxie.`;
  const share = encodeURIComponent(text);
  return (
    <main className="max-w-xl px-4 py-10">
      <p className="kicker text-xs text-slate">Settled</p>
      <h1 className="mt-2 text-3xl">The fill landed</h1>
      <article className="mt-6 rounded-card bg-deep p-5">
        <p className="text-platinum">{market}</p>
        <p className="stat mt-3 text-4xl">
          {side.toUpperCase()}
          {amount ? ` · $${amount}` : ""}
        </p>
        <p className="mt-3 text-sm">Non-custodial receipt. The position sits on the Polygon address derived from your Solana key.</p>
      </article>
      <div className="mt-6 flex flex-wrap gap-2">
        <a
          className="inline-flex h-11 items-center rounded-control bg-cta px-4 text-sm font-medium text-abyss"
          href={`https://twitter.com/intent/tweet?text=${share}`}
          target="_blank"
          rel="noreferrer"
        >
          Share on X
        </a>
        <Link to="/portfolio" className="inline-flex h-11 items-center rounded-control bg-kelp px-4 text-sm text-foam">
          Portfolio
        </Link>
      </div>
    </main>
  );
}
