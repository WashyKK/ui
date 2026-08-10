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
  const jar = await cookies();

  // ADMIN_EMAIL is the bootstrap owner: always an admin, and deliberately not
  // revocable from the panel, so a mistake in user_roles cannot lock everyone
  // out of the store.
  if (adminEmail && email === adminEmail.toLowerCase()) {
    jar.set("admin", "1", COOKIE_OPTS);
    return NextResponse.json({ ok: true, role: "admin" });
  }

  // select("*") rather than naming accepted_at: on a database that has not had
  // platform_admins.sql applied, naming a missing column fails the whole query
  // and every manager would be locked out.
  const { data: grant } = await supabaseServer
    .from("user_roles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (!grant) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Record the first sign-in so the panel can distinguish an invite that has
  // been taken up from one still outstanding.
  if ("accepted_at" in grant && !grant.accepted_at) {
    await supabaseServer
      .from("user_roles")
      .update({ accepted_at: new Date().toISOString() })
      .eq("email", email)
      // Pre-migration the column is absent; a failed stamp must not block sign-in.
      .then(undefined, () => undefined);
  }

  if (grant.role === "admin") {
    jar.set("admin", "1", COOKIE_OPTS);
    return NextResponse.json({ ok: true, role: "admin" });
  }

  if (grant.role === "store_manager") {
    jar.set("manager", "1", COOKIE_OPTS);
    return NextResponse.json({ ok: true, role: "store_manager" });
  }

  return NextResponse.json({ error: "Not authorized" }, { status: 403 });
}
