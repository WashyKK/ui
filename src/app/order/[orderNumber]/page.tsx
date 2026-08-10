import type { Metadata } from "next";
import OrderView from "./order-view";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default async function OrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return <OrderView orderNumber={orderNumber.toUpperCase()} />;
}
