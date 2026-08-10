import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { getVerifiedUser } from "@/lib/session";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

export async function POST(req: Request) {
  // The email must come from a verified Supabase session, never from the body —
  // otherwise anyone who knows ADMIN_EMAIL can POST it and be handed an admin cookie.
  const user = await getVerifiedUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const email = user.email;
  const adminEmail = process.env.ADMIN_EMAIL;

  // Admin check
  if (adminEmail && email === adminEmail.toLowerCase()) {
    cookies().set("admin", "1", COOKIE_OPTS);
    return NextResponse.json({ ok: true, role: "admin" });
  }

  // Manager check
  const { data: role } = await supabaseServer
    .from("user_roles")
    .select("role")
    .eq("email", email)
    .single();

  if (role?.role === "store_manager") {
    cookies().set("manager", "1", COOKIE_OPTS);
    return NextResponse.json({ ok: true, role: "store_manager" });
  }

  return NextResponse.json({ error: "Not authorized" }, { status: 403 });
}
