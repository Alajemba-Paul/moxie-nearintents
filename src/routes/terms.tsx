import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms · Moxie Markets" },
      {
        name: "description",
        content: "Terms of use for Moxie Markets private prediction terminal.",
      },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <main className="mx-auto max-w-2xl py-12 space-y-6">
      <div>
        <p className="text-caption text-fey-signal">Legal</p>
        <h1 className="mt-2 text-display text-fey-white">
          Terms of <span className="text-fey-ember">use.</span>
        </h1>
      </div>

      <div className="fey-card p-6 space-y-4 text-body text-fey-mist">
        <p>
          Moxie Markets gives you a direct web interface to lock USDC on Solana and route orders to Polymarket. You sign every transaction with your own wallet. Moxie never holds your private keys.
        </p>
        <p>
          When you click Lock bet, you set the market, outcome (YES or NO), USDC amount, price room (slippage percentage), and expiry time. If a solver cannot fill your order within your price room before the timer ends, you can reclaim your USDC from the Solana escrow account.
        </p>
        <p>
          Devnet and Polygon Amoy activity uses test tokens for demonstration. Make sure your Solana wallet is set to the correct network before approving a lock.
        </p>
        <p>
          Questions or support: <a href="mailto:moxiedotmarkets@gmail.com" className="text-fey-signal hover:underline">moxiedotmarkets@gmail.com</a> or <a href="https://x.com/moxiedotmarkets" target="_blank" rel="noreferrer" className="text-fey-signal hover:underline">@moxiedotmarkets</a>.
        </p>
      </div>
    </main>
  );
}
