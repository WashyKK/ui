import "server-only";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Resolve the caller's identity from their Supabase access token.
 *
 * This is the only place a request's identity may come from. An email in a
 * request body or query string is attacker-controlled and must never be
 * treated as proof of who is calling.
 */
export async function getVerifiedUser(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user?.email) return null;

  return { id: data.user.id, email: data.user.email.toLowerCase() };
}
