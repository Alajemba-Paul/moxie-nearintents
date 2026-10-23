import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms · Moxie" },
      {
        name: "description",
        content: "Non-custodial prediction terms for Moxie intents.",
      },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <main className="max-w-2xl px-4 py-8">
      <p className="kicker text-xs text-slate">Terms</p>
      <h1 className="mt-2 text-3xl">Prediction protocol terms</h1>
      <div className="mt-6 space-y-4 text-mist">
        <p>
          Moxie is a non-custodial interface. You sign every lock. ICM Labs does not hold your tokens and does not
          promise that a solver will fill a bet.
        </p>
        <p>
          An intent is a request: market, side, size, slippage room, and expiry. A match can fail. If the fill proof
          does not check out, the deposit stays locked until the escrow rules allow a refund.
        </p>
        <p>
          Devnet and Amoy activity is test traffic. Prices on the desk are a practice book unless a wallet transaction
          is confirmed on-chain. Settled rows are receipts, not investment advice.
        </p>
        <p>
          You are responsible for the wallet you connect and for setting that wallet to Devnet before you approve a
          lock. One escrow account can be open per Solana key.
        </p>
        <p>Contact ICM Labs, FUTO, Nigeria at ops@moxie.markets or icmlabs@gmail.com.</p>
      </div>
    </main>
  );
}
