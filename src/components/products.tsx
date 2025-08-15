// components/Products.tsx
import React from "react";
import { Product } from "@/components/types";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

// UI-only mock data (backend removed)
const mockProducts: Product[] = [
  {
    id: "p1",
    name: "Explorer Bot",
    description: "All-terrain mobile robot",
    price: 3999,
    stock: 12,
    category: "Mobile",
    imageUrl: "/mobile.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p2",
    name: "Factory Arm",
    description: "Compact industrial manipulator",
    price: 6499,
    stock: 5,
    category: "Industrial",
    imageUrl: "/industrial.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p3",
    name: "Humanoid Alpha",
    description: "Research-grade humanoid platform",
    price: 14999,
    stock: 2,
    category: "Humanoid",
    imageUrl: "/humanoid.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const Products: React.FC = () => {
  const products = mockProducts;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <Card key={product.id} className="w-full">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-48 object-cover"
          />
          <CardContent>
            <CardTitle>{product.name}</CardTitle>
            <CardDescription>{product.description}</CardDescription>
            <CardFooter>
              <span className="text-lg font-bold">{product.price}</span>
              <Link
                href={`/product/${product.id}`}
                className="text-blue-500 hover:underline ml-2"
              >
                View Details
              </Link>
            </CardFooter>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Products;
