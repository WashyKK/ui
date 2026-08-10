/**
 * The order lifecycle, in one place so the admin UI, the API and the customer
 * view cannot disagree about what a status means or what may follow it.
 */
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses an order may move to next. Empty means terminal. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled", "failed"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["packed", "cancelled", "refunded"],
  packed: ["shipped", "processing", "cancelled"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
  failed: ["pending"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** What the customer sees. Internal states collapse into fewer, plainer words. */
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Payment received",
  processing: "Being prepared",
  packed: "Ready to dispatch",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Payment failed",
};

export const STATUS_TONE: Record<OrderStatus, "neutral" | "progress" | "good" | "bad"> = {
  pending: "neutral",
  paid: "progress",
  processing: "progress",
  packed: "progress",
  shipped: "progress",
  delivered: "good",
  cancelled: "bad",
  refunded: "bad",
  failed: "bad",
};

/** Ordered steps shown as a progress trail; excludes the failure states. */
export const FULFILMENT_STEPS: OrderStatus[] = [
  "paid",
  "processing",
  "packed",
  "shipped",
  "delivered",
];
