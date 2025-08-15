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

interface Item {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

export default function Store() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Store</h1>
        <Link href="/admin/login">
          <Button variant="outline">Admin Login</Button>
        </Link>
      </div>
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
      
      <div>
        <h2 className="text-xl font-semibold">Products</h2>
        <Products />
      </div>

      <div>
        <h2>See also</h2>
      </div>

      <div className="flex justify-center mt-4">
      <Carousel
        opts={{
          align: "start",
        }}
        className="w-full max-w-sm"
      >
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="text-3xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      </div>
    </div>
  );
}
