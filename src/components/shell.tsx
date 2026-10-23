import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

const LINKS = [
  { to: "/", label: "Markets" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-abyss text-platinum">
      <header className="sticky top-0 z-40 bg-deep">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4">
          <Link to="/" className="text-lg font-medium tracking-[-0.04em] text-platinum">
            Moxie
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto text-xs text-mist sm:text-sm" aria-label="Primary">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-control px-3 py-2 hover:bg-kelp hover:text-foam"
                activeProps={{ className: "rounded-control bg-kelp px-3 py-2 text-foam" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px]">{children}</div>
      <footer className="mx-auto mt-16 max-w-[1440px] bg-deep px-4 py-8 text-sm text-mist">
        <p className="text-foam">ICM Labs, FUTO, Nigeria</p>
        <p className="mt-1">
          <a className="text-foam" href="mailto:ops@moxie.markets">
            ops@moxie.markets
          </a>
          {" · "}
          <a className="text-foam" href="mailto:icmlabs@gmail.com">
            icmlabs@gmail.com
          </a>
        </p>
      </footer>
      <CookieBanner />
    </div>
  );
}

function CookieBanner() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(window.localStorage.getItem("moxie-cookie") !== "1");
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-xl flex-col gap-3 rounded-card bg-kelp p-4 sm:bottom-4 sm:flex-row sm:items-center">
      <p className="text-sm text-mist">
        We store this desk on your device and call Solana and Polygon RPCs when you lock a bet. No ad cookies.
      </p>
      <button
        type="button"
        className="h-11 shrink-0 rounded-control bg-cta px-4 text-sm font-medium text-abyss"
        onClick={() => {
          window.localStorage.setItem("moxie-cookie", "1");
          setOpen(false);
        }}
      >
        Okay
      </button>
    </div>
  );
}
