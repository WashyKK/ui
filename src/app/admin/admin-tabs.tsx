"use client";

import { useState } from "react";
import AdminForm from "./product-form";
import CategoriesForm from "./categories-form";

const TABS = [
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
] as const;

type Tab = typeof TABS[number]["id"];

export default function AdminTabs() {
  const [active, setActive] = useState<Tab>("products");

  return (
    <div className="container mx-auto p-6">
      {/* Tab bar */}
      <div className="flex gap-1 mb-8 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "products" && <AdminForm />}
      {active === "categories" && <CategoriesForm />}
    </div>
  );
}
