import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import { cookies } from "next/headers";
import TopNav from "@/components/top-nav";
import SiteFooter from "@/components/site-footer";
import CartDrawer from "@/components/cart-drawer";
import { CartProvider } from "@/context/cart";
import { UserProvider } from "@/context/user";
import { CurrencyProvider } from "@/context/currency";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import { JsonLd, organizationSchema } from "@/lib/json-ld";

// Three roles: Inter reads long, Inter Tight compresses headlines without a
// second typeface, and JetBrains Mono carries part numbers and spec values,
// where a lining monospace makes 0/O and 1/l unambiguous.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase makes every relative OG/canonical URL absolute. Without it
  // Next emits paths, which crawlers and link unfurlers cannot resolve.
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — industrial parts, datasheet on every product`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_KE",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = cookies();
  const serverIsAdmin = jar.get("admin")?.value === "1";
  const serverIsManager = jar.get("manager")?.value === "1";

  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <head>
        <JsonLd data={organizationSchema()} />
      </head>
      <body className="min-h-screen flex flex-col bg-background font-sans text-foreground antialiased">
        <CurrencyProvider>
        <UserProvider>
          <CartProvider>
            <TopNav initialIsAdmin={serverIsAdmin} initialIsManager={serverIsManager} />
            <main className="flex-1 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 py-8">
              {children}
            </main>
            <SiteFooter />
            <CartDrawer />
          </CartProvider>
        </UserProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
