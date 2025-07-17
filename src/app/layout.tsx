// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";

const inter = Inter({ subsets: ["latin"] });

const items = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
];

export const metadata: Metadata = {
  title: "Elffie Technologies",
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
        <title>Elffie Technologies</title>
        {/* Other head elements like meta tags or links can go here */}
      </head>
      <body className="min-h-screen flex">
        <SidebarProvider defaultOpen>
          <AppSidebar />
          <SidebarTrigger />
          <main className="flex-1 flex justify-center items-center">
            {children}
          </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
