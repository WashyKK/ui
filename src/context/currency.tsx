"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getPublicUsdToKesRate } from "@/lib/fx";

export type Currency = "USD" | "KES" | "EUR";

// KES tracks the same rate the server charges at, so the price on the page and
// the amount debited cannot drift apart.
export const RATES: Record<Currency, number> = {
  USD: 1,
  KES: getPublicUsdToKesRate(),
  EUR: 0.92,
};
export const SYMBOLS: Record<Currency, string> = { USD: "$", KES: "KSh ", EUR: "€" };

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (usdAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: () => {},
  format: (n) => `$${n.toFixed(2)}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("USD");

  useEffect(() => {
    const stored = localStorage.getItem("currency") as Currency | null;
    if (stored && stored in RATES) setCurrencyState(stored);
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("currency", c);
  };

  const format = (usdAmount: number): string => {
    const converted = usdAmount * RATES[currency];
    const symbol = SYMBOLS[currency];
    if (currency === "KES") return `${symbol}${Math.round(converted).toLocaleString()}`;
    return `${symbol}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
