"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface UserContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  /** False until the client has asked the server what this visitor's role is.
   *  Callers use it to decide whether the server-rendered guess is still the
   *  best answer, or whether their own check has superseded it. */
  roleChecked: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  isManager: false,
  roleChecked: false,
  signIn: () => {},
  signOut: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const checkRole = async () => {
    try {
      const res = await fetch("/api/admin/check");
      const d = await res.json();
      setIsAdmin(!!d.isAdmin);
      setIsManager(!!d.isManager);
    } catch {
      // Leave the last known answer alone; a dropped request is not a demotion.
    } finally {
      setRoleChecked(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    checkRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      checkRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = () => {
    if (typeof window === "undefined") return;
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const signOut = async () => {
    // The admin/manager cookie is httpOnly, so only the server can clear it —
    // and it, not the Supabase session, is what every server-side authorisation
    // check actually reads. Without this call "Sign out" cleared the session in
    // localStorage and left a working admin cookie on the device for up to
    // seven days: the next person to pick up the phone could open /admin.
    // Awaited before the local reset so a failure here is not hidden by the UI
    // already looking signed out.
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Offline or the request failed. Still sign out locally, but the cookie
      // may survive — better than trapping someone in a signed-in state.
    }
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsManager(false);
  };

  return (
    <UserContext.Provider value={{ user, loading, isAdmin, isManager, roleChecked, signIn, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
