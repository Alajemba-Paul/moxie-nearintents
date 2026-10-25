import { createFileRoute } from "@tanstack/react-router";
import { fetchPolymarketOrderbook } from "@/lib/moxie/polymarket.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const Route = createFileRoute("/api/polymarket/book")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const marketId = url.searchParams.get("marketId") ?? "house-2026";
        const tokenId = url.searchParams.get("tokenId") ?? undefined;
        const payload = await fetchPolymarketOrderbook({ marketId, tokenId });
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

