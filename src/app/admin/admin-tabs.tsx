"use client";

import { useState } from "react";
import ProductsPanel from "./products-panel";
import CategoriesPanel from "./categories-panel";
import UsersPanel from "./users-panel";
import OrdersPanel from "./orders-panel";
import CustomersPanel from "./customers-panel";
import InsightsPanel from "./insights-panel";

interface Props {
  isAdmin: boolean;
}

export default function AdminTabs({ isAdmin }: Props) {
  // Orders first: the thing that needs attention on any given morning is an
  // order waiting to be packed, not the product form.
  const [active, setActive] = useState("orders");

  const tabs = [
    { id: "orders", label: "Orders" },
    { id: "products", label: "Products" },
    ...(isAdmin ? [{ id: "categories", label: "Categories" }] : []),
    ...(isAdmin ? [{ id: "users", label: "People" }] : []),
    ...(isAdmin ? [{ id: "customers", label: "Customers" }] : []),
    ...(isAdmin ? [{ id: "insights", label: "Insights" }] : []),
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

      {active === "orders" && <OrdersPanel />}
      {active === "products" && <ProductsPanel />}
      {active === "categories" && isAdmin && <CategoriesPanel />}
      {active === "users" && isAdmin && <UsersPanel />}
      {active === "customers" && isAdmin && <CustomersPanel />}
      {active === "insights" && isAdmin && <InsightsPanel />}
    </div>
  );
}
