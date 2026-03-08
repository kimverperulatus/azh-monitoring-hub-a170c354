import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "support" | "scanner" | "custom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  allowedPages: string[];
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: "support",
  loading: true,
  allowedPages: [],
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("support");
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRoleAndPermissions(userId: string) {
    // Fetch role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    const userRole = (profile?.role as UserRole) || "support";
    setRole(userRole);

    if (userRole === "admin") {
      setAllowedPages(["overview", "ekv", "letter_all", "letter_upload", "logs"]);
    } else {
      // Fetch from role_permissions
      const { data: perms } = await supabase
        .from("role_permissions")
        .select("page_key")
        .eq("role", userRole)
        .eq("allowed", true);

      const pages = perms?.map((p) => p.page_key) ?? ["overview"];
      setAllowedPages(pages);
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchRoleAndPermissions(session.user.id), 0);
        } else {
          setRole("support");
          setAllowedPages([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoleAndPermissions(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, role, loading, allowedPages, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
