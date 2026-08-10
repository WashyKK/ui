import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { canManageProducts } from "@/lib/auth-check";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export async function GET(req: Request) {
  if (!canManageProducts()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(0, Number(searchParams.get("page") ?? 0));
  const status = searchParams.get("status") ?? "";
  const search = (searchParams.get("q") ?? "").trim();

  let query = supabaseServer
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);
  if (search) {
    // Order number, email, company or PO — the four things someone has in hand
    // when they call about an order.
    const escaped = search.replace(/[%,()]/g, "");
    query = query.or(
      `order_number.ilike.%${escaped}%,customer_email.ilike.%${escaped}%,` +
        `company_name.ilike.%${escaped}%,po_reference.ilike.%${escaped}%`
    );
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    orders: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
