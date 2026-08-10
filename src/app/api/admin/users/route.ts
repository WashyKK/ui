import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth-check";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: roles } = await supabaseServer.from("user_roles").select("*");
  const roleMap = new Map((roles ?? []).map((r) => [r.email?.toLowerCase(), r]));

  const ownerEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

  const users = (data.users ?? []).map((u) => {
    const email = (u.email ?? "").toLowerCase();
    const grant = roleMap.get(email);
    return {
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.user_metadata?.name || null,
      avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
      provider: u.app_metadata?.provider || "email",
      // The bootstrap owner holds admin without a user_roles row.
      role: email && email === ownerEmail ? "admin" : (grant?.role ?? null),
      owner: Boolean(email && email === ownerEmail),
      invited: false,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
    };
  });

  // Grants for addresses that have never signed in are real, pending invites —
  // the role applies the moment they do. Without these the panel would show an
  // invite as having silently vanished.
  const known = new Set(users.map((u) => (u.email ?? "").toLowerCase()));
  const pending = (roles ?? [])
    .filter((r) => r.email && !known.has(r.email.toLowerCase()))
    .map((r) => ({
      id: `invite:${r.email}`,
      email: r.email,
      name: null,
      avatar: null,
      provider: "—",
      role: r.role,
      owner: false,
      invited: true,
      created_at: r.invited_at ?? r.created_at ?? null,
      last_sign_in: null,
    }));

  return NextResponse.json({ users: [...pending, ...users] });
}
