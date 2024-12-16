// components/types.ts
export interface Product {
    id: string;          // Change to string based on the API response
    name: string;
    price: number;
    stock: number;      // Add stock property
    category: string;   // Add category property
    createdAt: string;  // Change to camelCase for consistency
    updatedAt: string;  // Change to camelCase for consistency
  }
  