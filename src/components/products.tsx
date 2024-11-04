// components/Products.tsx
import React, { useEffect, useState } from "react";
import { Product } from "@/components/types";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";

const limit = 10; // Set your desired limit
const offset = 0; // Set your desired offset

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("eh!!!!!!!!!!!!!!!!!!!!!!")
        const response = await fetch(`http://localhost:9097/products/?limit=${limit}&offset=${offset}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
        });
        console.log(response.ok)
        console.log("eh!!!!!!!!!!!!!!!!!!!!!!")
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.ok}`);
        }
        console.log(response)
        const data: Product[] = await response.json();
        setProducts(data.products);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error fetching products: {error}</div>;

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
