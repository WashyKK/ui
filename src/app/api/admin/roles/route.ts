import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminRequest } from "@/lib/auth-check";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role } = await req.json().catch(() => ({}));
  if (!email || role !== "store_manager") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const adminEmail = cookies().get("admin")?.value === "1"
    ? process.env.ADMIN_EMAIL
    : null;

  const { error } = await supabaseServer.from("user_roles").upsert(
    { email, role, granted_by: adminEmail ?? "admin" },
    { onConflict: "email" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const { error } = await supabaseServer.from("user_roles").delete().eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
