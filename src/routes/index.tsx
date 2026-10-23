import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/desk/desk";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Markets · Moxie" },
      {
        name: "description",
        content: "Live prediction markets. Lock Solana USDC, match through NEAR, and fill without holding gas.",
      },
    ],
  }),
  component: Desk,
});