"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface UserContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  isManager: false,
  signIn: () => {},
  signOut: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  const checkRole = async () => {
    try {
      const res = await fetch("/api/admin/check");
      const d = await res.json();
      setIsAdmin(!!d.isAdmin);
      setIsManager(!!d.isManager);
    } catch {}
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
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsManager(false);
  };

  return (
    <UserContext.Provider value={{ user, loading, isAdmin, isManager, signIn, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
