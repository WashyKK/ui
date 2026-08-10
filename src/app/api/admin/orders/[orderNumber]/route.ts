import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { canManageProducts } from "@/lib/auth-check";
import { canTransition, ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";

export const dynamic = "force-dynamic";

function actor(): string {
  if (cookies().get("admin")?.value === "1") return process.env.ADMIN_EMAIL ?? "admin";
  return "store_manager";
}

export async function GET(
  _req: Request,
  { params }: { params: { orderNumber: string } }
) {
  if (!canManageProducts()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: order } = await supabaseServer
    .from("orders")
    .select("*")
    .eq("order_number", params.orderNumber.toUpperCase())
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: events } = await supabaseServer
    .from("order_events")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ order, events: events ?? [] });
}

export async function PATCH(
  req: Request,
  { params }: { params: { orderNumber: string } }
) {
  if (!canManageProducts()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderNumber = params.orderNumber.toUpperCase();
  const body = await req.json().catch(() => ({}));

  const { data: order } = await supabaseServer
    .from("orders")
    .select("id, status")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const from = order.status as OrderStatus;
  let to: OrderStatus | null = null;

  if (body.status) {
    const next = String(body.status) as OrderStatus;
    if (!ORDER_STATUSES.includes(next)) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    // The lifecycle is a graph, not a free-for-all: a delivered order cannot
    // quietly go back to pending, and nothing may skip payment.
    if (next !== from && !canTransition(from, next)) {
      return NextResponse.json(
        { error: `An order cannot go from ${from} to ${next}` },
        { status: 400 }
      );
    }
    if (next !== from) {
      to = next;
      patch.status = next;
      if (next === "shipped") patch.shipped_at = new Date().toISOString();
      if (next === "delivered") patch.delivered_at = new Date().toISOString();
    }
  }

  if (body.trackingNumber !== undefined) patch.tracking_number = body.trackingNumber || null;
  if (body.carrier !== undefined) patch.carrier = body.carrier || null;
  if (body.adminNotes !== undefined) patch.admin_notes = body.adminNotes || null;

  const { error } = await supabaseServer.from("orders").update(patch).eq("id", order.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseServer.from("order_events").insert({
    order_id: order.id,
    event: to ? "status_changed" : "details_updated",
    from_status: to ? from : null,
    to_status: to,
    note: body.note || null,
    actor: actor(),
  });

  return NextResponse.json({ ok: true, status: to ?? from });
}
