import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  credits: number;
  refreshCredits: () => Promise<void>;
  deductCredit: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  credits: 0,
  refreshCredits: async () => {},
  deductCredit: async () => false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    if (data) setCredits(data.credits);
  };

  const refreshCredits = async () => {
    if (user) await fetchCredits(user.id);
  };

  const deductCredit = async (): Promise<boolean> => {
    if (!user || credits <= 0) return false;
    const newCredits = credits - 1;
    const { error } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", user.id);
    if (error) return false;
    setCredits(newCredits);
    return true;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCredits(0);
  };

  useEffect(() => {
    // IMPORTANT: Do NOT await inside onAuthStateChange — it blocks auth in production
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          fetchCredits(u.id); // fire and forget
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchCredits(u.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, credits, refreshCredits, deductCredit, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
