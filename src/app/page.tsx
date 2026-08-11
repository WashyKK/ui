import type { Metadata } from "next";
import Link from "next/link";
import { toProduct, type Product } from "@/components/types";
import { productPath } from "@/lib/slug";
import { SITE_DESCRIPTION } from "@/lib/site";
import { listProducts } from "@/lib/products-query";
import { attributeIndex, facets as loadFacets } from "@/lib/attributes.server";
import { loadCategoryTree } from "@/lib/categories.server";
import Catalogue from "./catalogue";

export const metadata: Metadata = {
  // No title override: the root page keeps the site title from the layout
  // rather than becoming "Catalogue — Elffie Robotics", which reads oddly as a
  // homepage <title> and in a search result.
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

// The catalogue changes when the admin edits it, not per request.
export const revalidate = 300;

async function getProducts(): Promise<{ products: Product[]; rows: any[] }> {
  const { data } = await listProducts();
  return { products: data.map(toProduct), rows: data };
}

export default async function CataloguePage() {
  const [{ products, rows }, facets, attributes, categoryTree] = await Promise.all([
    getProducts(),
    loadFacets(),
    attributeIndex(),
    loadCategoryTree(),
  ]);

  return (
    <>
      <Catalogue
        initialProducts={products}
        facets={facets}
        attributeIndex={attributes}
        categoryTree={categoryTree}
      />

      {/*
        The catalogue arrives in the HTML now, but the filtering UI is a client
        island and its links are built in JavaScript. This list is the crawlable
        copy — every product, as a real anchor, in the server-rendered markup.
        Visually hidden rather than display:none so it stays in the a11y tree.
      */}
      <nav aria-label="All products" className="sr-only">
        <h2>All products</h2>
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={productPath({ id: row.id, slug: row.slug })}>{row.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
