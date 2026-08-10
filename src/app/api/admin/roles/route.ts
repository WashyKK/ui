import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminRequest } from "@/lib/auth-check";
import { supabaseServer } from "@/lib/supabaseServer";
import { isEmailConfigured, sendStaffInvite } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const ROLES = new Set(["admin", "store_manager"]);

async function actingAdminEmail(): Promise<string | null> {
  return (await cookies()).get("admin")?.value === "1"
    ? (process.env.ADMIN_EMAIL ?? null)
    : null;
}

/** Grant or change a role — also how someone is invited before they ever sign in. */
export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email: rawEmail, role } = await req.json().catch(() => ({}));
  const email = String(rawEmail ?? "").toLowerCase().trim();

  if (!email.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }
  if (!ROLES.has(role)) {
    return NextResponse.json(
      { error: "Role must be 'admin' or 'store_manager'" },
      { status: 400 }
    );
  }

  // Sign-in looks this row up lower-cased, so a grant to "Foo@Bar.com" would
  // never be found.
  const { error } = await supabaseServer.from("user_roles").upsert(
    { email, role, granted_by: (await actingAdminEmail()) ?? "admin" },
    { onConflict: "email" }
  );

  if (error) {
    // 23514 = check constraint. Until platform_admins.sql runs, user_roles only
    // permits 'store_manager', and the raw Postgres text explains none of that.
    if (error.code === "23514" && role === "admin") {
      return NextResponse.json(
        { error: "Platform admins need supabase/platform_admins.sql applied first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The grant lands whether or not this person has an account yet: sign-in
  // resolves by address, so inviting someone who has never visited works.
  //
  // The email is a courtesy, not the mechanism — access is already live. So a
  // failed send must not fail the grant, but it must be reported rather than
  // swallowed, or the admin is left believing something was sent.
  const emailed = await sendStaffInvite({
    to: email,
    role,
    signInUrl: absoluteUrl("/admin/login"),
    invitedBy: await actingAdminEmail(),
  }).catch(() => false);

  return NextResponse.json({
    ok: true,
    email,
    role,
    emailed,
    emailConfigured: isEmailConfigured(),
  });
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email: rawEmail } = await req.json().catch(() => ({}));
  const email = String(rawEmail ?? "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // ADMIN_EMAIL is not stored in this table, so revoking it here would silently
  // do nothing. Say so instead.
  if (email === (process.env.ADMIN_EMAIL ?? "").toLowerCase()) {
    return NextResponse.json(
      { error: "The owner account cannot be revoked here — change ADMIN_EMAIL instead." },
      { status: 400 }
    );
  }

  // Refuse to remove the last admin when there is no ADMIN_EMAIL fallback.
  // Otherwise one revoke can leave the store with nobody able to appoint anyone.
  const { data: target } = await supabaseServer
    .from("user_roles")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  if (target?.role === "admin" && !process.env.ADMIN_EMAIL) {
    const { count } = await supabaseServer
      .from("user_roles")
      .select("email", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "This is the only admin. Appoint another before revoking this one." },
        { status: 409 }
      );
    }
  }

  const { error } = await supabaseServer.from("user_roles").delete().eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
