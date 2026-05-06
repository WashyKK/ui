"use client";

import { useState } from "react";
import AdminForm from "./product-form";
import CategoriesForm from "./categories-form";
import UsersPanel from "./users-panel";

interface Props {
  isAdmin: boolean;
}

export default function AdminTabs({ isAdmin }: Props) {
  const [active, setActive] = useState("products");

  const tabs = [
    { id: "products", label: "Products" },
    ...(isAdmin ? [{ id: "categories", label: "Categories" }] : []),
    ...(isAdmin ? [{ id: "users", label: "Users" }] : []),
  ];

  return (
    <div className="container mx-auto p-6">
      {/* Tab bar */}
      <div className="flex gap-1 mb-8 border-b">
        {tabs.map((tab) => (
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
      {active === "categories" && isAdmin && <CategoriesForm />}
      {active === "users" && isAdmin && <UsersPanel />}
    </div>
  );
}
