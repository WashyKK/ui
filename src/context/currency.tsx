"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getPublicUsdToKesRate, usdToKes } from "@/lib/fx";

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

/**
 * KES is the default, not USD.
 *
 * The shop is in Nairobi, quotes in shillings, and takes M-Pesa — and the
 * structured data has always declared priceCurrency KES, so the visible price
 * was disagreeing with what search engines were told. Prices are still *held*
 * in USD; this is only what a visitor sees before they touch the switcher.
 *
 * Only an explicit choice is written to localStorage, so anyone who never
 * picked a currency gets shillings from now on. Someone who deliberately chose
 * dollars keeps them.
 */
const DEFAULT_CURRENCY: Currency = "KES";

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  format: (n) => `KSh ${usdToKes(n, RATES.KES).toLocaleString()}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    const stored = localStorage.getItem("currency") as Currency | null;
    if (stored && stored in RATES) setCurrencyState(stored);
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("currency", c);
  };

  const format = (usdAmount: number): string => {
    const symbol = SYMBOLS[currency];
    // Shillings go through the same helper the checkout charges with, not a
    // second rounding of its own. They disagreed: display rounded and the
    // charge rounds up, so the Arduino Uno read KSh 1,400 on the page and was
    // billed at KSh 1,401. A price shown is a price promised.
    if (currency === "KES") {
      return `${symbol}${usdToKes(usdAmount, RATES.KES).toLocaleString()}`;
    }
    return `${symbol}${(usdAmount * RATES[currency]).toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
