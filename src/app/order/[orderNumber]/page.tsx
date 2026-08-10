import type { Metadata } from "next";
import OrderView from "./order-view";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default function OrderPage({ params }: { params: { orderNumber: string } }) {
  return <OrderView orderNumber={params.orderNumber.toUpperCase()} />;
}
