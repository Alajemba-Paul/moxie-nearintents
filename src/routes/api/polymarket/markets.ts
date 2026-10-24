import { createFileRoute } from "@tanstack/react-router";
import { fetchPolymarketMarkets } from "@/lib/moxie/polymarket.server";

export const runtime = "nodejs";

export const Route = createFileRoute("/api/polymarket/markets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get("q") ?? "";
        const category = url.searchParams.get("category") ?? "All";
        const payload = await fetchPolymarketMarkets({ query, category });
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});

