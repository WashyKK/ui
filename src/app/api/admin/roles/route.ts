import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminRequest } from "@/lib/auth-check";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role } = await req.json().catch(() => ({}));
  if (!email || role !== "store_manager") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const adminEmail = (await cookies()).get("admin")?.value === "1"
    ? process.env.ADMIN_EMAIL
    : null;

  // Sign-in looks this row up lower-cased, so a grant to "Foo@Bar.com" would
  // never be found.
  const { error } = await supabaseServer.from("user_roles").upsert(
    { email: String(email).toLowerCase().trim(), role, granted_by: adminEmail ?? "admin" },
    { onConflict: "email" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const { error } = await supabaseServer
    .from("user_roles")
    .delete()
    .eq("email", String(email).toLowerCase().trim());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
