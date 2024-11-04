// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import Sidebar from "@/components/ui/sidebar";

const inter = Inter({ subsets: ["latin"] });

const items = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
];

export const metadata: Metadata = {
  title: "Ge Harashim",
  description: "Embedded experts!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>{metadata.title}</title>
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <div className="min-h-screen flex">
          <Sidebar items={items} />
          <main className="flex-grow p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
