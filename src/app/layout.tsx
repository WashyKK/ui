// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import TopNav from "@/components/top-nav";

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
        <TopNav />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
