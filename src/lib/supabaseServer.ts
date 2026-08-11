// Fails the build if this module is ever pulled into a client bundle.
//
// It was: lib/categories.ts and lib/product-resources.ts each imported this
// AND exported pure helpers that client components use, so the whole module —
// including a createClient() call for the service-role key — was bundled into
// the browser. createClient(url, undefined) throws at module evaluation, which
// took out /admin and the store. The key itself was never exposed (Next does
// not inline non-NEXT_PUBLIC env vars), but the shape of the mistake is one
// rename away from shipping it.
import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE as string;

export const supabaseServer = createClient(supabaseUrl, serviceRole);
