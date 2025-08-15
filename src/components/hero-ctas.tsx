"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeroCTAs() {
  const pathname = usePathname();
  const onStore = pathname?.startsWith("/store");
  return (
    <div className="mt-6 flex justify-center gap-3">
      <Link
        href="mailto:washingtonkigan@gmail.com?subject=Sales%20Inquiry%20%E2%80%94%20Elffie%20Robotics"
        className="px-5 py-2 rounded-lg bg-accent text-white hover:opacity-90 active:opacity-80 transition"
      >
        Talk to Sales
      </Link>
      <Link
        href="/store"
        className={
          onStore
            ? "px-5 py-2 rounded-lg bg-accent text-white hover:opacity-90 active:opacity-80 transition"
            : "px-5 py-2 rounded-lg border border-accent text-accent hover:bg-accent hover:text-white active:opacity-80 transition"
        }
        aria-current={onStore ? "page" : undefined}
      >
        Explore Store
      </Link>
    </div>
  );
}

