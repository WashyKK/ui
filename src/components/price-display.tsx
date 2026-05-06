"use client";

import { useCurrency } from "@/context/currency";

export function PriceDisplay({ usd, className }: { usd: number; className?: string }) {
  const { format } = useCurrency();
  return <span className={className}>{format(usd)}</span>;
}
