import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Users, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Referral {
  id: string;
  status: string;
  credits_awarded: number;
  created_at: string;
}

const ReferralSection = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch referral code
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();
      if (profile) setReferralCode(profile.referral_code);

      // Fetch referrals
      const { data: refs } = await supabase
        .from("referrals")
        .select("id, status, credits_awarded, created_at")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      if (refs) setReferrals(refs);
    };

    fetchData();
  }, [user]);

  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Link copied!", description: "Share it with friends to earn credits." });
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const completedCount = referrals.filter((r) => r.status === "completed").length;
  const earnedCredits = referrals.reduce((sum, r) => sum + r.credits_awarded, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Referral link */}
      <div className="rounded-3xl bg-surface p-5 card-depth">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Refer & Earn</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Share your link. When a friend signs up and buys credits, you get <span className="text-primary font-medium">3 bonus credits</span>.
        </p>
        <button
          onClick={handleCopy}
          className="flex w-full items-center gap-2 rounded-2xl bg-background p-3 ring-1 ring-border text-left ease-presence transition-transform active:scale-[0.98]"
        >
          <span className="flex-1 text-[11px] text-muted-foreground truncate">{referralLink}</span>
          {copied ? (
            <Check className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-surface p-3 text-center card-depth">
          <p className="tabular-nums text-xl font-semibold text-foreground">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-2xl bg-surface p-3 text-center card-depth">
          <p className="tabular-nums text-xl font-semibold text-foreground">{completedCount}</p>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </div>
        <div className="rounded-2xl bg-surface p-3 text-center card-depth">
          <p className="tabular-nums text-xl font-semibold text-primary">{earnedCredits}</p>
          <p className="text-[10px] text-muted-foreground">Earned</p>
        </div>
      </div>

      {/* Pending referrals notice */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-primary/5 p-3">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-[11px] text-muted-foreground">
            You have <span className="text-primary font-medium">{pendingCount} referral{pendingCount > 1 ? "s" : ""} pending</span> — credits will be added when they purchase.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReferralSection;
