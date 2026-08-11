"use client";

import { useState } from "react";
import ProductsPanel from "./products-panel";
import CategoriesPanel from "./categories-panel";
import UsersPanel from "./users-panel";
import OrdersPanel from "./orders-panel";
import CustomersPanel from "./customers-panel";
import InsightsPanel from "./insights-panel";
import RequestsPanel from "./requests-panel";
import GiftCardsPanel from "./gift-cards-panel";

interface Props {
  isAdmin: boolean;
}

export default function AdminTabs({ isAdmin }: Props) {
  // Orders first: the thing that needs attention on any given morning is an
  // order waiting to be packed, not the product form.
  const [active, setActive] = useState("orders");

  const tabs = [
    { id: "orders", label: "Orders" },
    { id: "requests", label: "Requests" },
    { id: "products", label: "Products" },
    ...(isAdmin ? [{ id: "categories", label: "Categories" }] : []),
    ...(isAdmin ? [{ id: "users", label: "People" }] : []),
    ...(isAdmin ? [{ id: "customers", label: "Customers" }] : []),
    ...(isAdmin ? [{ id: "giftcards", label: "Gift cards" }] : []),
    ...(isAdmin ? [{ id: "insights", label: "Insights" }] : []),
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6">
      {/* Tab bar.
          The eight tabs are far wider than a phone. Without a scroll container
          of their own they widened the page itself, which dragged the header,
          the search box and every table sideways with them — the whole document
          scrolled horizontally instead of just this strip. The negative margin
          lets it bleed to the screen edge so it reads as a scrollable rail
          rather than content that has been cut off. */}
      <div className="-mx-4 sm:-mx-6 mb-8 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-1 px-4 sm:px-6 w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                active === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {active === "orders" && <OrdersPanel />}
      {active === "requests" && <RequestsPanel />}
      {active === "products" && <ProductsPanel />}
      {active === "categories" && isAdmin && <CategoriesPanel />}
      {active === "users" && isAdmin && <UsersPanel />}
      {active === "customers" && isAdmin && <CustomersPanel />}
      {active === "giftcards" && isAdmin && <GiftCardsPanel />}
      {active === "insights" && isAdmin && <InsightsPanel />}
    </div>
  );
}
