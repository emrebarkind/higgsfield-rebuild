import Link from "next/link";

const REPO = "https://github.com/emrebarkind/higgsfield-rebuild";

const PRODUCT = [
  { href: "/explore", label: "Explore" },
  { href: "/", label: "Studio" },
  { href: "/frames", label: "Frames" },
  { href: "/moves", label: "Moves" },
  { href: "/dailies", label: "Dailies" },
  { href: "/pricing", label: "Pricing" },
];

const MADE = [
  { href: REPO, label: "Source code" },
  { href: `${REPO}/blob/main/DECISIONS.md`, label: "Every decision, with evidence" },
  { href: `${REPO}/tree/main/docs/recon`, label: "Research on Higgsfield" },
  { href: `${REPO}/tree/main/.agent-logs`, label: "Agent logs" },
];

export function Footer() {
  return (
    // Extra room on phones: the Studio's Roll bar is pinned to the bottom.
    <footer className="mt-12 border-t border-line pb-28 pt-8 lg:pb-10">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-xl font-bold uppercase tracking-wide">Dailies</p>
          <p className="mt-2 max-w-xs text-muted">
            A real camera for your still images. Runs in your browser; nothing costs credits.
          </p>
        </div>
        <nav aria-label="Product">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Product</p>
          <ul className="mt-2 space-y-1.5">
            {PRODUCT.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="hover:text-paper hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="How it was made">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">How it was made</p>
          <ul className="mt-2 space-y-1.5">
            {MADE.map(({ href, label }) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noreferrer" className="hover:text-paper hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-[1440px] px-4 text-xs text-muted sm:px-6">
        An 8x take-home by Emre Dugenci, built in 24 hours. Inspired by Higgsfield; not affiliated with it.
      </p>
    </footer>
  );
}
