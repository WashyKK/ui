"use client";

import React from "react";
import Link from "next/link";

interface SidebarProps {
  items: { label: string; href: string }[]; // Define the shape of the sidebar items
}

const Sidebar: React.FC<SidebarProps> = ({ items }) => {
  return (
    <div className="flex flex-col h-full w-64 bg-gray-800 text-white">
      <div className="p-4 text-xl font-bold border-b border-gray-700">My Sidebar</div>
      <nav className="flex-grow">
        <ul className="flex flex-col p-4">
          {items.map((item) => (
            <li key={item.href} className="mb-2">
              <Link href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <footer className="p-4 border-t border-gray-700">
        <p className="text-sm">© 2024 My Company</p>
      </footer>
    </div>
  );
};

export default Sidebar;
