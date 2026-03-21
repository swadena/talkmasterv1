import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  credits: number;
  creditsExpireAt: Date | null;
  daysUntilExpiry: number | null;
  foundingUser: boolean;
  hasPurchased: boolean;
  isAdmin: boolean;
  isPremiumOverride: boolean;
  setIsPremiumOverride: (v: boolean) => void;
  refreshCredits: () => Promise<void>;
  deductCredit: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  credits: 0,
  creditsExpireAt: null,
  daysUntilExpiry: null,
  foundingUser: false,
  hasPurchased: false,
  isAdmin: false,
  isPremiumOverride: false,
  setIsPremiumOverride: () => {},
  refreshCredits: async () => {},
  deductCredit: async () => false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [creditsExpireAt, setCreditsExpireAt] = useState<Date | null>(null);
  const [foundingUser, setFoundingUser] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Premium override is now in-memory only and gated behind server-side admin check
  const [isPremiumOverride, setIsPremiumOverrideState] = useState(false);

  const setIsPremiumOverride = (v: boolean) => {
    // Only allow server-verified admins to set the override
    if (!isAdmin) return;
    setIsPremiumOverrideState(v);
  };

  const fetchAdminStatus = async () => {
    const { data, error } = await supabase.rpc("is_admin");
    if (!error && data === true) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  const daysUntilExpiry = creditsExpireAt
    ? Math.max(0, Math.ceil((creditsExpireAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("credits, credits_expire_at, founding_user, has_purchased")
      .eq("id", userId)
      .single();
    if (data) {
      setCredits(data.credits);
      setCreditsExpireAt(data.credits_expire_at ? new Date(data.credits_expire_at) : null);
      setFoundingUser(data.founding_user ?? false);
      setHasPurchased(data.has_purchased ?? false);
    }
  };

  const refreshCredits = async () => {
    if (user) await fetchCredits(user.id);
  };

  const deductCredit = async (): Promise<boolean> => {
    if (!user || credits <= 0) return false;
    const { data, error } = await supabase.rpc("deduct_credit");
    if (error || !data) return false;
    setCredits((prev) => Math.max(0, prev - 1));
    return true;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCredits(0);
    setIsPremiumOverrideState(false);
  };

  const linkReferral = async (userId: string) => {
    const pendingRef = localStorage.getItem("pending_referral");
    if (!pendingRef) return;
    localStorage.removeItem("pending_referral");

    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", pendingRef)
      .single();

    if (!referrer || referrer.id === userId) return;

    // Use secure RPC to set referred_by
    await supabase.rpc("set_referred_by", { _referrer_id: referrer.id });

    await supabase.from("referrals").insert([{
      referrer_id: referrer.id,
      referred_id: userId,
    }]);
  };

  useEffect(() => {
    // Clean up old localStorage key if it exists
    localStorage.removeItem("premium_override");
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          fetchCredits(u.id);
          fetchAdminStatus();
          linkReferral(u.id);
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
    <AuthContext.Provider value={{ user, loading, credits, creditsExpireAt, daysUntilExpiry, foundingUser, hasPurchased, isAdmin, isPremiumOverride, setIsPremiumOverride, refreshCredits, deductCredit, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
