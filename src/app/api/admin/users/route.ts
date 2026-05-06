import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth-check";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: roles } = await supabaseServer.from("user_roles").select("email, role, created_at");
  const roleMap = new Map((roles ?? []).map((r) => [r.email, r.role]));

  const users = (data.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || u.user_metadata?.name || null,
    avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
    provider: u.app_metadata?.provider || "email",
    role: roleMap.get(u.email ?? "") ?? null,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
  }));

  return NextResponse.json({ users });
}
