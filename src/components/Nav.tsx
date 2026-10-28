"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Studio" },
  { href: "/moves", label: "Moves" },
  { href: "/dailies", label: "Dailies" },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-bold uppercase tracking-wide">
          Dailies
        </Link>
        <ul className="flex items-center gap-1 text-sm">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded px-3 py-1.5 transition-colors ${
                    active ? "bg-paper text-bg" : "text-muted hover:text-paper"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
