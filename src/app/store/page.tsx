"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import Products from "@/components/products";
import Reveal from "@/components/reveal";

interface Item {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

export default function Store() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <section className="rounded-2xl border bg-gradient-to-b from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-900/40 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Elffie Store</h1>
            <p className="text-sm text-muted-foreground mt-1">Research platforms, manipulators, and mobile systems</p>
          </div>
          <Link href="/admin/login">
            <Button variant="outline">Admin Login</Button>
          </Link>
        </div>
      </section>
      <NavigationMenu>
        <NavigationMenuList>
          {/* Example category links */}
          <NavigationMenuItem>
            <NavigationMenuTrigger>Category 1</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/category1">
                Category 1
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Category 2</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/category2">
                Category 2
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          {/* Add more categories as needed */}
        </NavigationMenuList>
      </NavigationMenu>
      
      <section className="mt-6">
        <h2 className="text-xl font-semibold">Products</h2>
        <div className="h-0.5 w-24 bg-accent rounded-full my-3" />
        <Products />
      </section>

      <div>
        <h2>See also</h2>
      </div>

      {/* Removed bottom carousel / see also section */}
    </div>
  );
}
