import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const ADMIN_EMAILS = ["maimoonaswadena@gmail.com"];

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
  // Premium override is now in-memory only and gated behind admin email check
  const [isPremiumOverride, setIsPremiumOverrideState] = useState(false);

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email ?? "");

  const setIsPremiumOverride = (v: boolean) => {
    // Only allow admins to set the override
    if (!isAdmin) return;
    setIsPremiumOverrideState(v);
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

    await supabase
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", userId);

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
