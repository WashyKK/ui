"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

/**
 * Where the provider reports a refusal depends on the flow: PKCE puts it in the
 * query string, the implicit flow puts it in the fragment. Reading only one of
 * them makes a cancelled consent screen look like a hang.
 */
function readOAuthError(search: URLSearchParams): string | null {
  const fromQuery = search.get("error_description") || search.get("error");
  if (fromQuery) return fromQuery;
  if (typeof window === "undefined") return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hash.get("error_description") || hash.get("error");
}

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing sign in…");
  const handled = useRef(false);

  useEffect(() => {
    const from = searchParams.get("from");
    // Only someone who started at the admin screen should be sent back to it.
    // A shopper who cancels the Google prompt belongs on the storefront, not
    // staring at an "Admin Login" form they have no business with.
    const bounce = from === "admin" ? "/admin/login?error=auth_failed" : "/";

    if (readOAuthError(searchParams)) {
      handled.current = true;
      setMessage("Google sign in was cancelled.");
      const t = setTimeout(() => router.push(bounce), 2000);
      return () => clearTimeout(t);
    }

    const finish = async (session: Session) => {
      if (handled.current) return;
      handled.current = true;

      let res: Response;
      try {
        res = await fetch("/api/admin/google-login", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch {
        // The session is real — only the role lookup failed. Setting
        // handled.current above already disarmed the timeout, so without this
        // branch a dropped request left the user on the spinner for good.
        // They are signed in; send them somewhere useful and let the header's
        // own role check sort out the panel link.
        window.location.href = from === "admin" ? "/admin" : "/";
        return;
      }

      if (res.ok) {
        // A full navigation rather than router.push: the admin cookie was set
        // on that response, and only a fresh document request carries it into
        // the server render that decides whether the panel link appears. A
        // client-side push would leave the header a paint behind.
        window.location.href = from === "admin" ? "/admin" : "/";
        return;
      }

      if (from === "admin") {
        await supabase.auth.signOut();
        setMessage("Access denied — this Google account cannot open the admin panel.");
        setTimeout(() => router.push("/admin/login?error=not_admin"), 2500);
        return;
      }

      // Signed in from the storefront. Not being staff is the normal case, so
      // this is a success: they are signed in and go back to shopping.
      window.location.href = "/";
    };

    // The client establishes the session itself from whatever the provider left
    // in the URL — `?code=` under PKCE, `#access_token=` under the implicit
    // flow. Waiting for that result instead of parsing the URL here is what
    // makes this correct under both. The previous version looked for `?code=`
    // only, so on the implicit flow it reported a missing code and sent the
    // user back to the login screen while they were, in fact, signed in — and
    // /api/admin/google-login never ran, which is why no admin link appeared.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void finish(session);
    });

    // Covers the case where the session was already in place before the
    // listener attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void finish(data.session);
    });

    const timeout = setTimeout(() => {
      if (handled.current) return;
      handled.current = true;
      router.push("/admin/login?error=no_session");
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
