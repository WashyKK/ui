import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminRequest } from "@/lib/auth-check";

export const dynamic = "force-dynamic";

/**
 * Everyone who has ever bought or registered.
 *
 * The People tab lists Supabase auth users, which misses the ones that matter
 * most: guests who checked out without creating an account. Their only trace is
 * an email on an order. This unions both, so a customer who bought twice as a
 * guest and never registered is still a customer.
 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: authUsers }, orders, mpesa] = await Promise.all([
    supabaseServer.auth.admin.listUsers({ perPage: 1000 }),
    supabaseServer.from("orders").select("*"),
    supabaseServer.from("mpesa_orders").select("*"),
  ]);

  interface Row {
    email: string;
    name: string | null;
    registered: boolean;
    createdAt: string | null;
    lastSignIn: string | null;
    orders: number;
    paidOrders: number;
    lifetimeKes: number;
    lastOrderAt: string | null;
    phone: string | null;
    company: string | null;
    environment: string | null;
  }

  const byEmail = new Map<string, Row>();

  const upsert = (email: string | null | undefined): Row | null => {
    const key = (email ?? "").toLowerCase().trim();
    if (!key || !key.includes("@")) return null;
    let row = byEmail.get(key);
    if (!row) {
      row = {
        email: key, name: null, registered: false, createdAt: null, lastSignIn: null,
        orders: 0, paidOrders: 0, lifetimeKes: 0, lastOrderAt: null,
        phone: null, company: null, environment: null,
      };
      byEmail.set(key, row);
    }
    return row;
  };

  for (const u of authUsers?.users ?? []) {
    const row = upsert(u.email);
    if (!row) continue;
    row.registered = true;
    row.name = u.user_metadata?.full_name || u.user_metadata?.name || null;
    row.createdAt = u.created_at;
    row.lastSignIn = u.last_sign_in_at ?? null;
  }

  const PAID = new Set(["paid", "processing", "packed", "shipped", "delivered"]);

  for (const o of (orders.data ?? []) as any[]) {
    const row = upsert(o.customer_email);
    if (!row) continue;
    row.orders += 1;
    row.phone ??= o.customer_phone ?? null;
    row.company ??= o.company_name ?? null;
    row.environment ??= o.environment ?? null;
    if (PAID.has(o.status)) {
      row.paidOrders += 1;
      // amount_minor is KES cents; the legacy Stripe rows carry USD in
      // amount_total instead, so fall back rather than reporting zero.
      row.lifetimeKes += o.amount_minor
        ? Number(o.amount_minor) / 100
        : Number(o.amount_total ?? 0) / 100;
    }
    if (!row.lastOrderAt || o.created_at > row.lastOrderAt) row.lastOrderAt = o.created_at;
  }

  for (const o of (mpesa.data ?? []) as any[]) {
    const row = upsert(o.email);
    if (!row) continue;
    row.orders += 1;
    row.environment ??= o.environment ?? null;
    if (o.status === "completed") {
      row.paidOrders += 1;
      row.lifetimeKes += Number(o.amount ?? 0);
    }
    if (!row.lastOrderAt || o.created_at > row.lastOrderAt) row.lastOrderAt = o.created_at;
  }

  const customers = Array.from(byEmail.values()).sort((a, b) => {
    if (b.lifetimeKes !== a.lifetimeKes) return b.lifetimeKes - a.lifetimeKes;
    return (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? "");
  });

  return NextResponse.json({
    customers,
    summary: {
      total: customers.length,
      registered: customers.filter((c) => c.registered).length,
      guests: customers.filter((c) => !c.registered && c.orders > 0).length,
      buyers: customers.filter((c) => c.paidOrders > 0).length,
      lifetimeKes: customers.reduce((sum, c) => sum + c.lifetimeKes, 0),
    },
  });
}
