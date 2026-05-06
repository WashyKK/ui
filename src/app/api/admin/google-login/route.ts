import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const adminEmail = process.env.ADMIN_EMAIL;

  // Admin check
  if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
    cookies().set("admin", "1", COOKIE_OPTS);
    return NextResponse.json({ ok: true, role: "admin" });
  }

  // Manager check
  const { data: role } = await supabaseServer
    .from("user_roles")
    .select("role")
    .eq("email", email.toLowerCase())
    .single();

  if (role?.role === "store_manager") {
    cookies().set("manager", "1", COOKIE_OPTS);
    return NextResponse.json({ ok: true, role: "store_manager" });
  }

  return NextResponse.json({ error: "Not authorized" }, { status: 403 });
}
