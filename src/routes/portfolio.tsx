import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatShares, formatUsdc, positionsOf } from "@/lib/moxie/format";
import { MARKETS } from "@/lib/moxie/markets";
import { useDesk } from "@/lib/moxie/store";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio · Moxie" },
      { name: "description", content: "Open intents, share balances, and settled fills on Moxie." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const [ready, setReady] = useState(false);
  const orders = useDesk((state) => state.orders);
  const available = useDesk((state) => state.available);
  const locked = useDesk((state) => state.locked);
  useEffect(() => {
    void Promise.resolve(useDesk.persist.rehydrate()).finally(() => setReady(true));
  }, []);
  const positions = positionsOf(orders);
  const history = orders.filter((order) => order.phase === "settled" || order.phase === "refunded");

  return (
    <main className="px-4 py-8">
      <p className="kicker text-xs text-slate">Portfolio</p>
      <h1 className="mt-2 text-3xl text-platinum">What you hold</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-card bg-deep p-5">
          <p className="kicker text-xs text-slate">Free</p>
          <p className="stat mt-2 text-3xl">{ready ? formatUsdc(available) : "—"}</p>
        </article>
        <article className="rounded-card bg-deep p-5">
          <p className="kicker text-xs text-slate">Locked</p>
          <p className="stat mt-2 text-3xl">{ready ? formatUsdc(locked) : "—"}</p>
        </article>
      </div>
      <h2 className="mt-10 text-xl text-platinum">Shares</h2>
      {positions.length === 0 ? (
        <p className="mt-3 text-mist">No settled shares yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-kelp border-t border-kelp">
          {positions.map((position) => (
            <li key={position.tokenId} className="flex items-center justify-between py-3">
              <span>
                <span className="block text-platinum">{MARKETS.find((item) => item.id === position.marketId)?.question}</span>
                <span className="text-xs text-foam">{position.side.toUpperCase()}</span>
              </span>
              <span className="stat">{formatShares(position.sharesMicro)}</span>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 text-xl text-platinum">Intents</h2>
      <ul className="mt-3 space-y-3">
        {history.length === 0 ? <li className="text-mist">Nothing settled on this device.</li> : null}
        {history.map((order) => (
          <li key={order.id} className="rounded-card bg-kelp p-4">
            <p className="text-platinum">{MARKETS.find((item) => item.id === order.intent.marketId)?.question}</p>
            <p className="mt-1 text-sm text-mist">
              {order.phase} · {order.intent.side.toUpperCase()} · {formatUsdc(order.intent.sizeMicro)} USDC
            </p>
            {order.polygonTxHex ? (
              <a
                className="mt-2 inline-block text-sm text-foam"
                href={`https://amoy.polygonscan.com/tx/${order.polygonTxHex.startsWith("0x") ? order.polygonTxHex : `0x${order.polygonTxHex}`}`}
                target="_blank"
                rel="noreferrer"
              >
                Polygonscan
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      <Link to="/" className="mt-8 inline-flex h-11 items-center rounded-control bg-cta px-4 text-sm font-medium text-abyss">
        Back to markets
      </Link>
    </main>
  );
}
