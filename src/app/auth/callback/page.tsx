"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setMessage("Google sign in was cancelled.");
      setTimeout(() => router.push("/admin/login"), 2000);
      return;
    }

    if (!code) {
      router.push("/admin/login?error=no_code");
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.session?.user?.email) {
        setMessage("Authentication failed. Redirecting…");
        setTimeout(() => router.push("/admin/login?error=auth_failed"), 2000);
        return;
      }

      const res = await fetch("/api/admin/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.session.user.email }),
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        await supabase.auth.signOut();
        setMessage("Access denied — this Google account is not the admin.");
        setTimeout(() => router.push("/admin/login?error=not_admin"), 2500);
      }
    });
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
