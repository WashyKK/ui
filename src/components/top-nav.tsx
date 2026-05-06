"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ShoppingCart, LogIn, LogOut, User, Settings } from "lucide-react";
import { useCart } from "@/context/cart";
import { useUser } from "@/context/user";
import { useCurrency, type Currency } from "@/context/currency";

const CURRENCIES: Currency[] = ["USD", "KES", "EUR"];

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { totalItems, openCart } = useCart();
  const { user, loading, isAdmin, isManager, signIn, signOut } = useUser();
  const { currency, setCurrency } = useCurrency();

  const linkClass = (href: string) =>
    `${pathname.startsWith(href) ? "text-foreground underline underline-offset-4" : "text-muted-foreground hover:text-foreground"}`;

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Account";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

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
          {(isAdmin || isManager) && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/10 text-accent hover:bg-accent hover:text-white transition-colors text-sm font-medium"
            >
              <Settings className="h-3.5 w-3.5" />
              {isAdmin ? "Admin" : "Manage Products"}
            </Link>
          )}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <button
            onClick={openCart}
            className="relative p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>

          {/* Currency switcher — desktop */}
          <div className="hidden md:flex items-center rounded-md border overflow-hidden text-xs">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-2.5 py-1.5 transition-colors ${
                  currency === c
                    ? "bg-accent text-white font-semibold"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* User account — desktop */}
          {!loading && (
            <div className="hidden md:block relative">
              {user ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
                  >
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={displayName} width={24} height={24} className="rounded-full" />
                    ) : (
                      <span className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-semibold">
                        {displayName[0].toUpperCase()}
                      </span>
                    )}
                    <span className="max-w-[120px] truncate text-sm font-medium">{displayName}</span>
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border bg-white dark:bg-zinc-900 shadow-lg py-1 text-sm">
                        <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b mb-1">{user.email}</div>
                        <button
                          onClick={() => { signOut(); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <button
                  onClick={signIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in
                </button>
              )}
            </div>
          )}

          {/* Mobile buttons */}
          <div className="flex items-center gap-2 md:hidden">
            {!loading && user ? (
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="p-1.5 rounded-full border"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={22} height={22} className="rounded-full" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </button>
            ) : !loading ? (
              <button
                onClick={signIn}
                className="p-1.5 rounded-md border"
                aria-label="Sign in"
              >
                <LogIn className="h-4 w-4" />
              </button>
            ) : null}
            <button
              aria-label="Open menu"
              className="p-2 rounded-md border"
              onClick={() => setOpen((v) => !v)}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile user menu */}
      {userMenuOpen && user && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setUserMenuOpen(false)} />
          <div className="fixed top-14 right-4 z-50 w-56 rounded-xl border bg-white dark:bg-zinc-900 shadow-lg py-1 text-sm md:hidden">
            <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b mb-1">{user.email}</div>
            <button
              onClick={() => { signOut(); setUserMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}

      {/* Mobile nav panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 animate-[fadeIn_180ms_ease-out] md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed top-14 inset-x-0 z-50 md:hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="rounded-b-xl border border-t-0 bg-white/95 dark:bg-zinc-900/95 shadow-sm animate-[slideDown_200ms_ease-out]">
                <div className="py-3 grid gap-2 text-sm">
                  <Link href="/store" className="py-2 hover:underline" onClick={() => setOpen(false)}>Store</Link>
                  <Link href="/academy" className="py-2 hover:underline" onClick={() => setOpen(false)}>Academy</Link>
                  <Link href="/team" className="py-2 hover:underline" onClick={() => setOpen(false)}>Team</Link>
                  <a href="mailto:washingtonkigan@gmail.com?subject=Inquiry%20%E2%80%94%20Elffie%20Robotics" className="py-2 text-accent" onClick={() => setOpen(false)}>Contact</a>
                  {(isAdmin || isManager) && (
                    <Link
                      href="/admin"
                      className="py-2 flex items-center gap-1.5 font-medium text-accent"
                      onClick={() => setOpen(false)}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      {isAdmin ? "Admin" : "Manage Products"}
                    </Link>
                  )}
                  {/* Currency switcher */}
                  <div className="pt-2 border-t flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">Currency:</span>
                    {CURRENCIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCurrency(c); setOpen(false); }}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          currency === c ? "bg-accent text-white border-accent" : "border-input text-muted-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
