"use client";

import * as React from "react";
import Link from "next/link";
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
} from "@/components/ui/carousel"


interface Item {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

const items: Item[] = [
  { id: "1", name: "Item One", price: "$10.00", description: "Description for item one", imageUrl: "/images/item1.jpg" },
  { id: "2", name: "Item Two", price: "$15.00", description: "Description for item two", imageUrl: "/images/item2.jpg" },
  { id: "3", name: "Item Three", price: "$20.00", description: "Description for item three", imageUrl: "/images/item3.jpg" },
  { id: "4", name: "Item Four", price: "$25.00", description: "Description for item four", imageUrl: "/images/item4.jpg" },
  { id: "1", name: "Item One", price: "$10.00", description: "Description for item one", imageUrl: "/images/item1.jpg" },
  { id: "2", name: "Item Two", price: "$15.00", description: "Description for item two", imageUrl: "/images/item2.jpg" },
  { id: "3", name: "Item Three", price: "$20.00", description: "Description for item three", imageUrl: "/images/item3.jpg" },
  { id: "4", name: "Item Four", price: "$25.00", description: "Description for item four", imageUrl: "/images/item4.jpg" },
  { id: "1", name: "Item One", price: "$10.00", description: "Description for item one", imageUrl: "/images/item1.jpg" },
  { id: "2", name: "Item Two", price: "$15.00", description: "Description for item two", imageUrl: "/images/item2.jpg" },
  { id: "3", name: "Item Three", price: "$20.00", description: "Description for item three", imageUrl: "/images/item3.jpg" },
  { id: "4", name: "Item Four", price: "$25.00", description: "Description for item four", imageUrl: "/images/item4.jpg" },
  { id: "1", name: "Item One", price: "$10.00", description: "Description for item one", imageUrl: "/images/item1.jpg" },
  { id: "2", name: "Item Two", price: "$15.00", description: "Description for item two", imageUrl: "/images/item2.jpg" },
  { id: "3", name: "Item Three", price: "$20.00", description: "Description for item three", imageUrl: "/images/item3.jpg" },
  { id: "4", name: "Item Four", price: "$25.00", description: "Description for item four", imageUrl: "/images/item4.jpg" },
];

export default function Store() {
  return (
    <div className="container mx-auto p-4">
      <NavigationMenu>
        <NavigationMenuList>
          {/* Example category links */}
          <NavigationMenuItem>
            <NavigationMenuTrigger>Category 1</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/category1">Category 1</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Category 2</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/category2">Category 2</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          {/* Add more categories as needed */}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
        {items.map((item) => (
          <Card key={item.id} className="w-full">
            <img src={item.imageUrl} alt={item.name} className="w-full h-48 object-cover" />
            <CardContent>
              <CardTitle>{item.name}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
              <CardFooter>
                <span className="text-lg font-bold">{item.price}</span>
                <Link href={`/product/${item.id}`} className="text-blue-500 hover:underline ml-2">
                  View Details
                </Link>
              </CardFooter>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2>
          See also
        </h2>
      </div>

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
  );
}
