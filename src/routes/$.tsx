import { createFileRoute, Link } from "@tanstack/react-router";
import { ParticleOrb } from "@/components/particle-orb";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Not found · Moxie" },
      { name: "description", content: "That Moxie page is not on the desk." },
    ],
  }),
  component: Missing,
});

function Missing() {
  return (
    <main className="flex flex-col items-center px-4 py-16 text-center">
      <ParticleOrb className="h-56 w-56" disperse />
      <h1 className="mt-4 text-3xl">This page drifted off</h1>
      <p className="mt-2 max-w-sm">The route is not part of the terminal.</p>
      <Link to="/" className="mt-6 inline-flex h-11 items-center rounded-control bg-cta px-4 text-sm font-medium text-abyss">
        Return to markets
      </Link>
    </main>
  );
}
