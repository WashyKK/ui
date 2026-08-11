"use client";

import { useCurrency } from "@/context/currency";

/**
 * A price, and the discount if there is one.
 *
 * The struck-through original and the percent-off sit together so the saving is
 * legible without arithmetic — and so a sale reads as a sale rather than as a
 * price that happens to be low.
 */
export function PriceDisplay({
  usd, className, wasUsd, percentOff,
}: {
  usd: number;
  className?: string;
  wasUsd?: number | null;
  percentOff?: number | null;
}) {
  const { format } = useCurrency();
  if (!wasUsd || wasUsd <= usd) return <span className={className}>{format(usd)}</span>;

  return (
    <span className="inline-flex items-baseline gap-2 flex-wrap">
      <span className={className}>{format(usd)}</span>
      <s className="text-muted-foreground text-[0.8em] font-normal">{format(wasUsd)}</s>
      {percentOff ? (
        <span className="label-micro border border-signal text-signal px-1.5 py-0.5 not-italic">
          {percentOff}% off
        </span>
      ) : null}
    </span>
  );
}
