import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy · Moxie" },
      {
        name: "description",
        content: "How Moxie handles keys, intents, and RPC data. Non-custodial.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="max-w-2xl px-4 py-8">
      <p className="kicker text-xs text-slate">Privacy</p>
      <h1 className="mt-2 text-3xl">Your keys stay yours</h1>
      <div className="mt-6 space-y-4 text-mist">
        <p>
          Moxie does not take custody of your USDC. A lock is a Solana transaction you sign. The market you want is
          committed as a hash. The public instruction only carries the amount, the hash, and an expiry.
        </p>
        <p>
          Connecting Phantom, Solflare, Backpack, or a mobile wallet reads the public key the wallet returns. Social
          options on this preview create an embedded Solana key in this browser. That key is not a Privy account unless
          a Privy app id is configured later.
        </p>
        <p>
          The desk calls Solana Devnet and Polygon Amoy RPCs to simulate, send, and read balances. Those providers see
          your IP and the public transaction. We do not sell that traffic.
        </p>
        <p>
          Intent rows store the Solana address, the derived Polygon address, the market hash, the amount, and the
          status. They are not tied to a private profile.
        </p>
        <p>
          ICM Labs, FUTO, Nigeria. Questions: ops@moxie.markets or icmlabs@gmail.com.
        </p>
      </div>
    </main>
  );
}
