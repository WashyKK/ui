import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

/**
 * The browser Supabase client.
 *
 * `flowType` is set explicitly because auth-js still defaults to `implicit`,
 * and that default is what broke Google sign-in: the implicit flow returns the
 * tokens in the URL *fragment* (`#access_token=…`), so the callback's
 * `searchParams.get("code")` was always null and every successful sign-in was
 * reported as "Missing authentication code" — while the session had in fact
 * been established.
 *
 * PKCE is also the flow to want here on its own merits. The implicit flow puts
 * an access token and a long-lived refresh token into the address bar, which
 * means they land in the phone's browser history; PKCE returns a single-use
 * code instead.
 *
 * The callback at /auth/callback waits for the session rather than reading the
 * URL itself, so it is correct under either flow — this line is the only thing
 * that would need changing to back PKCE out.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
