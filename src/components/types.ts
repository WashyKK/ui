// components/types.ts
export interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
    description?: string;
    imageUrl?: string;
    datasheetUrl?: string;
    createdAt: string;
    updatedAt: string;
  }
  