"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/", label: "Studio" },
  { href: "/frames", label: "Frames" },
  { href: "/moves", label: "Moves" },
  { href: "/dailies", label: "Dailies" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const list = useRef<HTMLUListElement>(null);
  // On a phone the list scrolls sideways; keep the current section in view.
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const ul = list.current;
    if (el && ul) ul.scrollLeft = Math.max(0, el.offsetLeft - (ul.clientWidth - el.offsetWidth) / 2);
  }, [pathname]);
  return (
    <header className="border-b border-line">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link href="/explore" className="shrink-0 font-display text-xl font-bold uppercase tracking-wide">
          Dailies
        </Link>
        {/* On a phone the sections scroll sideways rather than wrap. */}
        <ul ref={list} className="relative -mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 text-sm [scrollbar-width:none]">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded px-3 py-1.5 transition-colors ${active ? "bg-paper text-bg" : "text-muted hover:text-paper"}`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/pricing"
          aria-current={pathname === "/pricing" ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2 rounded border px-2.5 py-1.5 text-sm transition-colors sm:px-3 ${
            pathname === "/pricing" ? "border-paper text-paper" : "border-line text-muted hover:text-paper"
          }`}
        >
          {/* On a phone the badge alone stands for Pricing, to leave room for the sections. */}
          <span className="sr-only sm:not-sr-only">Pricing</span>
          <span className="rounded bg-go px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-paper">Free</span>
        </Link>
      </nav>
    </header>
  );
}
