import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import TopNav from "@/components/top-nav";
import CartDrawer from "@/components/cart-drawer";
import { CartProvider } from "@/context/cart";
import { UserProvider } from "@/context/user";
import { CurrencyProvider } from "@/context/currency";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Elffie Robotics",
  description: "Enterprise robotics and AI systems.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <CurrencyProvider>
        <UserProvider>
          <CartProvider>
            <TopNav />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
            <CartDrawer />
          </CartProvider>
        </UserProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
