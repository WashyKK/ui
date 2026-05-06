"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart, LogIn, LogOut, User, Settings, ClipboardList } from "lucide-react";
import { useCart } from "@/context/cart";
import { useUser } from "@/context/user";
import { useCurrency, type Currency } from "@/context/currency";

const CURRENCIES: Currency[] = ["USD", "KES", "EUR"];

interface TopNavProps {
  initialIsAdmin?: boolean;
  initialIsManager?: boolean;
}

export default function TopNav({ initialIsAdmin = false, initialIsManager = false }: TopNavProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { totalItems, openCart } = useCart();
  const { user, loading, isAdmin: ctxAdmin, isManager: ctxManager, signIn, signOut } = useUser();
  const { currency, setCurrency } = useCurrency();

  const isAdmin = ctxAdmin || initialIsAdmin;
  const isManager = ctxManager || initialIsManager;

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Account";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const menuLinkClass = "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left rounded-md text-sm";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:bg-zinc-900/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/store" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.svg" alt="Elffie" width={26} height={26} />
          <span className="text-sm font-semibold tracking-tight">Elffie Robotics</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Currency switcher */}
          <div className="flex items-center rounded-md border overflow-hidden text-xs">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-2.5 py-1.5 transition-colors ${
                  currency === c ? "bg-accent text-white font-semibold" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

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

          {/* User account */}
          {!loading && (
            <div className="relative">
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
                    <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium">{displayName}</span>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border bg-white dark:bg-zinc-900 shadow-lg p-1 text-sm">
                        <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b mb-1">{user.email}</div>

                        <Link href="/account/orders" className={menuLinkClass} onClick={() => setUserMenuOpen(false)}>
                          <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                          Order History
                        </Link>

                        {(isAdmin || isManager) && (
                          <Link href="/admin" className={menuLinkClass} onClick={() => setUserMenuOpen(false)}>
                            <Settings className="h-3.5 w-3.5 shrink-0" />
                            {isAdmin ? "Admin Panel" : "Manage Products"}
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
