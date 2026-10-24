import { createFileRoute, Link } from "@tanstack/react-router";
import { ParticleOrb } from "@/components/particle-orb";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "404 Not Found · Moxie Markets" },
      { name: "description", content: "That page was not found on the Moxie Markets terminal." },
    ],
  }),
  component: MissingPage,
});

function MissingPage() {
  return (
    <main className="flex flex-col items-center px-4 py-16 text-center space-y-5">
      <ParticleOrb className="h-48 w-48" disperse />
      <p className="text-caption text-fey-ember">Error 404</p>
      <h1 className="text-display text-fey-white">
        This page drifted <span className="text-fey-ember">off.</span>
      </h1>
      <p className="max-w-sm text-body text-fey-mist">
        That link is not on the terminal. Jump back to live markets or check your portfolio.
      </p>
      <div className="flex items-center gap-3 pt-2">
        <Link to="/markets" className="ghost-pill-cta inline-flex h-11 items-center px-6 text-body font-medium">
          Open Markets
        </Link>
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-pill bg-fey-charcoal border border-fey-smoke px-5 text-body font-medium text-fey-mist hover:text-fey-white"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
