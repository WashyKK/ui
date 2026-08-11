import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { canManageProducts } from "@/lib/auth-check";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await canManageProducts())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ ready: false, requests: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ready: true, requests: data ?? [] });
}

const STATUSES = new Set(["new", "sourcing", "quoted", "ordered", "declined", "closed"]);

export async function PATCH(req: Request) {
  if (!(await canManageProducts())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "Which request?" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    update.status = body.status;
    // handled is the old boolean; keep it in step so nothing reading it drifts.
    update.handled = ["closed", "declined", "ordered"].includes(body.status);
  }
  if (body.adminNotes !== undefined) update.admin_notes = body.adminNotes || null;
  if (body.leadTime !== undefined) update.lead_time = body.leadTime || null;
  if (body.quotedKes !== undefined) {
    update.quoted_minor = body.quotedKes ? Math.round(Number(body.quotedKes) * 100) : null;
    update.quoted_at = body.quotedKes ? new Date().toISOString() : null;
  }

  const { error } = await supabaseServer
    .from("contact_messages")
    .update(update)
    .eq("id", body.id);

  if (error) {
    if (/status|quoted_minor|lead_time|admin_notes/i.test(error.message)) {
      return NextResponse.json(
        { error: "Request tracking needs supabase/sourcing_requests.sql applied first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
