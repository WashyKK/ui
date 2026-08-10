"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ClipboardList, LogIn, LogOut, Menu, Settings, ShoppingCart, X,
} from "lucide-react";
import { useCart } from "@/context/cart";
import { useUser } from "@/context/user";
import { useCurrency, type Currency } from "@/context/currency";

const CURRENCIES: Currency[] = ["USD", "KES", "EUR"];

const NAV_LINKS = [
  { href: "/store", label: "Catalogue" },
  { href: "/contact", label: "Request a quote" },
  { href: "/faq", label: "Support" },
];

interface TopNavProps {
  initialIsAdmin?: boolean;
  initialIsManager?: boolean;
}

export default function TopNav({ initialIsAdmin = false, initialIsManager = false }: TopNavProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { totalItems, openCart } = useCart();
  const { user, loading, isAdmin: ctxAdmin, isManager: ctxManager, signIn, signOut } = useUser();
  const { currency, setCurrency } = useCurrency();

  // The server-rendered values matter: without them the admin link pops in a
  // frame late, after the client role check resolves.
  const isAdmin = ctxAdmin || initialIsAdmin;
  const isManager = ctxManager || initialIsManager;

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Account";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const menuLinkClass =
    "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left rounded-sm text-sm";

  return (
    <>
      {/* Utility bar. The signal dot is the only colour above the fold. */}
      <div className="bg-obsidian text-bone">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
          <div className="flex h-9 items-center justify-between label-micro">
            <span className="flex items-center gap-2">
              <span className="inline-block size-1.5 rounded-full bg-signal signal-dot" />
              <span className="hidden sm:inline">In stock · ships from Nairobi</span>
              <span className="sm:hidden">Nairobi</span>
            </span>
            <div className="flex items-center gap-5 text-steel">
              <span className="hidden md:inline">Datasheet on every product</span>
              <a href="mailto:admin@elffie.com" className="hover:text-bone transition-colors">
                admin@elffie.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-sm hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/store" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.svg" alt="" width={24} height={24} />
              <span className="display-headline text-lg">Elffie</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-7 ml-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors ${
                    pathname === link.href
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 ml-auto">
              <div className="hidden sm:flex items-center rounded-sm border overflow-hidden text-xs">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-2.5 py-1.5 transition-colors ${
                      currency === c
                        ? "bg-foreground text-background font-medium"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <button
                onClick={openCart}
                className="relative p-2 rounded-sm hover:bg-muted transition-colors"
                aria-label={`Open cart, ${totalItems} item${totalItems === 1 ? "" : "s"}`}
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-signal text-obsidian text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </button>

              {!loading && (
                <div className="relative">
                  {user ? (
                    <>
                      <button
                        onClick={() => setUserMenuOpen((v) => !v)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted transition-colors"
                      >
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl} alt="" width={24} height={24}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                            {displayName[0].toUpperCase()}
                          </span>
                        )}
                        <span className="hidden sm:block max-w-[120px] truncate text-sm">
                          {displayName}
                        </span>
                      </button>

                      {userMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                          <div className="absolute right-0 top-11 z-50 w-56 rounded-sm border bg-popover shadow-lg p-1 text-sm">
                            <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b mb-1">
                              {user.email}
                            </div>

                            <Link
                              href="/account/orders" className={menuLinkClass}
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                              Order history
                            </Link>

                            {(isAdmin || isManager) && (
                              <Link
                                href="/admin" className={menuLinkClass}
                                onClick={() => setUserMenuOpen(false)}
                              >
                                <Settings className="h-3.5 w-3.5 shrink-0" />
                                {isAdmin ? "Admin panel" : "Manage products"}
                              </Link>
                            )}

                            <div className="border-t my-1" />

                            <button
                              onClick={() => { signOut(); setUserMenuOpen(false); }}
                              className={`${menuLinkClass} text-destructive hover:text-destructive`}
                            >
                              <LogOut className="h-3.5 w-3.5 shrink-0" />
                              Sign out
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={signIn}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-sm hover:bg-muted transition-colors"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Sign in</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation. Most of this store's traffic is a phone, so the
          links cannot live only in a lg: breakpoint. */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-obsidian/60"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-background border-r p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-4">
              <span className="display-headline text-lg">Elffie</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 -mr-2 rounded-sm hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-sm text-sm hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t my-3" />

            <Link
              href="/account/orders"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-sm text-sm hover:bg-muted transition-colors"
            >
              Order history
            </Link>
            {(isAdmin || isManager) && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-sm text-sm hover:bg-muted transition-colors"
              >
                {isAdmin ? "Admin panel" : "Manage products"}
              </Link>
            )}

            <div className="mt-auto pt-4 border-t">
              <p className="label-micro text-muted-foreground mb-2">Currency</p>
              <div className="flex rounded-sm border overflow-hidden text-xs">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`flex-1 px-2.5 py-2 transition-colors ${
                      currency === c
                        ? "bg-foreground text-background font-medium"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
