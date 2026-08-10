"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getShippingLabel } from "@/lib/shipping";
import {
  ALLOWED_TRANSITIONS, CUSTOMER_STATUS_LABEL, ORDER_STATUSES, STATUS_TONE,
  type OrderStatus,
} from "@/lib/order-status";

interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  provider: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company_name: string | null;
  po_reference: string | null;
  recipient_name: string | null;
  delivery_town: string | null;
  delivery_county: string | null;
  delivery_landmark: string | null;
  pickup_point: string | null;
  delivery_notes: string | null;
  address_line1: string | null;
  address_city: string | null;
  address_country: string | null;
  kra_pin: string | null;
  shipping_zone: string | null;
  amount_minor: number | null;
  subtotal_usd: number | null;
  shipping_usd: number | null;
  currency: string | null;
  items: { productId: string; name: string; unitPriceUsd: number; quantity: number }[] | null;
  tracking_number: string | null;
  carrier: string | null;
  admin_notes: string | null;
  payment_channel: string | null;
  payment_receipt: string | null;
  environment: string | null;
  created_at: string;
}

const TONE: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  progress: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  good: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  bad: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

const input =
  "h-9 rounded-md border border-input bg-background px-3 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-ring";

export default function OrdersPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load orders");
      setOrders(data.orders);
      setTotal(data.total);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, query]);

  useEffect(() => { load(); }, [load]);

  const patch = async (orderNumber: string, body: Record<string, unknown>) => {
    setSaving(orderNumber);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const pages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Order number, email, company or PO"
            className={`${input} w-full pl-8`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className={input}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{CUSTOMER_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground tabular-nums">
          {total} order{total === 1 ? "" : "s"}
        </span>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Package className="h-10 w-10 text-muted-foreground opacity-25 mx-auto" />
          <p className="text-sm text-muted-foreground">No orders match that.</p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {orders.map((order) => {
            const open = openId === order.id;
            const kes = order.amount_minor ? Number(order.amount_minor) / 100 : null;
            return (
              <div key={order.id}>
                <button
                  onClick={() => setOpenId(open ? null : order.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm font-mono">
                      {order.order_number}
                      {order.environment === "test" && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1 py-px font-sans">
                          test
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.company_name || order.customer_email || "—"}
                      {order.po_reference ? ` · PO ${order.po_reference}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${TONE[STATUS_TONE[order.status]]}`}>
                    {CUSTOMER_STATUS_LABEL[order.status]}
                  </span>
                  <span className="text-sm tabular-nums shrink-0 w-24 text-right">
                    {kes ? `KSh ${kes.toLocaleString()}` : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">
                    {new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                  </span>
                </button>

                {open && (
                  <div className="px-4 pb-4 space-y-4 bg-muted/20 border-t">
                    <div className="grid sm:grid-cols-2 gap-4 pt-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Deliver to</p>
                        {order.recipient_name && <p>{order.recipient_name}</p>}
                        {order.customer_phone && (
                          <p className="text-muted-foreground">
                            <a href={`tel:+${order.customer_phone}`} className="hover:underline">
                              +{order.customer_phone}
                            </a>
                          </p>
                        )}
                        {order.delivery_town && (
                          <p className="text-muted-foreground">
                            {order.delivery_town}
                            {order.delivery_county ? `, ${order.delivery_county}` : ""}
                          </p>
                        )}
                        {order.delivery_landmark && (
                          <p className="text-muted-foreground">{order.delivery_landmark}</p>
                        )}
                        {order.pickup_point && (
                          <p className="text-muted-foreground">Pickup: {order.pickup_point}</p>
                        )}
                        {order.address_line1 && (
                          <p className="text-muted-foreground">
                            {order.address_line1}
                            {order.address_city ? `, ${order.address_city}` : ""}
                            {order.address_country ? `, ${order.address_country}` : ""}
                          </p>
                        )}
                        {order.shipping_zone && (
                          <p className="text-muted-foreground text-xs">
                            Zone: {getShippingLabel(order.shipping_zone)}
                          </p>
                        )}
                        {order.delivery_notes && (
                          <p className="text-muted-foreground italic">“{order.delivery_notes}”</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Items</p>
                        {(order.items ?? []).map((item) => (
                          <p key={item.productId} className="text-muted-foreground">
                            {item.quantity} × {item.name}
                          </p>
                        ))}
                        {order.kra_pin && (
                          <p className="text-muted-foreground text-xs pt-1">KRA {order.kra_pin}</p>
                        )}
                        {order.payment_channel && (
                          <p className="text-muted-foreground text-xs">
                            Paid by {order.payment_channel}
                            {order.payment_receipt ? ` · ${order.payment_receipt}` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-end pt-3 border-t">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Move to</label>
                        <select
                          className={input}
                          defaultValue=""
                          disabled={saving === order.order_number}
                          onChange={(e) => {
                            if (e.target.value) patch(order.order_number, { status: e.target.value });
                            e.target.value = "";
                          }}
                        >
                          <option value="">— Choose —</option>
                          {(ALLOWED_TRANSITIONS[order.status] ?? []).map((s) => (
                            <option key={s} value={s}>{CUSTOMER_STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Carrier</label>
                        <input
                          className={`${input} w-32`}
                          defaultValue={order.carrier ?? ""}
                          onBlur={(e) =>
                            e.target.value !== (order.carrier ?? "") &&
                            patch(order.order_number, { carrier: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Tracking</label>
                        <input
                          className={`${input} w-40`}
                          defaultValue={order.tracking_number ?? ""}
                          onBlur={(e) =>
                            e.target.value !== (order.tracking_number ?? "") &&
                            patch(order.order_number, { trackingNumber: e.target.value })
                          }
                        />
                      </div>

                      {saving === order.order_number && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mb-2" />
                      )}
                    </div>

                    {(ALLOWED_TRANSITIONS[order.status] ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        {CUSTOMER_STATUS_LABEL[order.status]} is final — no further changes.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline" size="sm" disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page + 1} of {pages}
          </span>
          <Button
            variant="outline" size="sm" disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
