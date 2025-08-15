"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const linkClass = (href: string) =>
    `${pathname.startsWith(href) ? "text-foreground underline underline-offset-4" : "text-muted-foreground hover:text-foreground"}`;
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:bg-zinc-900/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Elffie" width={26} height={26} />
            <span className="text-sm font-semibold tracking-tight">Elffie Robotics</span>
          </Link>
        </div>
        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/store" className={linkClass("/store")}>Store</Link>
          <Link href="/academy" className={linkClass("/academy")}>Academy</Link>
          <Link href="/team" className={linkClass("/team")}>Team</Link>
          <a href="mailto:washingtonkigan@gmail.com?subject=Inquiry%20%E2%80%94%20Elffie%20Robotics" className="text-accent">Contact</a>
        </nav>
        {/* Mobile actions */}
        <div className="flex items-center gap-3 md:hidden">
          <a
            href="mailto:washingtonkigan@gmail.com?subject=Inquiry%20%E2%80%94%20Elffie%20Robotics"
            className="text-xs px-3 py-1.5 rounded-md bg-accent text-white"
          >
            Contact
          </a>
          <button
            aria-label="Open menu"
            className="p-2 rounded-md border"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Mobile menu panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 animate-[fadeIn_180ms_ease-out] md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-14 inset-x-0 z-50 md:hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="rounded-b-xl border border-t-0 bg-white/95 dark:bg-zinc-900/95 shadow-sm animate-[slideDown_200ms_ease-out]">
                <div className="py-3 grid gap-2 text-sm">
                  <Link href="/store" className="py-2 hover:underline" onClick={() => setOpen(false)}>Store</Link>
                  <Link href="/academy" className="py-2 hover:underline" onClick={() => setOpen(false)}>Academy</Link>
                  <Link href="/team" className="py-2 hover:underline" onClick={() => setOpen(false)}>Team</Link>
                  <a
                    href="mailto:washingtonkigan@gmail.com?subject=Inquiry%20%E2%80%94%20Elffie%20Robotics"
                    className="py-2 text-accent"
                    onClick={() => setOpen(false)}
                  >
                    Contact
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
