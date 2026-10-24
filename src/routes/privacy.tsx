import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy · Moxie Markets" },
      {
        name: "description",
        content: "How Moxie Markets protects your wallet keys, private order routing, and RPC data.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="mx-auto max-w-2xl py-12 space-y-6">
      <div>
        <p className="text-caption text-fey-signal">Privacy</p>
        <h1 className="mt-2 text-display text-fey-white">
          Your keys stay <span className="text-fey-growth">yours.</span>
        </h1>
      </div>

      <div className="fey-card p-6 space-y-4 text-body text-fey-mist">
        <p>
          Moxie Markets never takes control of your USDC. Every bet starts with a Solana escrow lock that you approve. The public Solana transaction only stores the USDC amount, a hash of your order, and the expiry time—so copy-trading bots cannot see which market or side you picked.
        </p>
        <p>
          Connecting Phantom, Solflare, Backpack, or a mobile wallet reads only your public Solana address. From that public address, Moxie derives your Polygon settlement address using NEAR Chain Signatures (<code className="tnum text-fey-signal">v1.signer-prod.testnet</code>).
        </p>
        <p>
          The terminal connects to Solana, NEAR, and Polygon RPC providers to read balances and submit transactions. We do not use advertising trackers or sell user data.
        </p>
        <p>
          Contact us at <a href="mailto:moxiedotmarkets@gmail.com" className="text-fey-signal hover:underline">moxiedotmarkets@gmail.com</a> or on X at <a href="https://x.com/moxiedotmarkets" target="_blank" rel="noreferrer" className="text-fey-signal hover:underline">@moxiedotmarkets</a>.
        </p>
      </div>
    </main>
  );
}
