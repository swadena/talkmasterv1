import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const packages = [
  { id: "single", name: "Quick Credit", credits: 1, price: 2 },
  { id: "starter", name: "Starter Pack", credits: 10, price: 9 },
  { id: "pro", name: "Pro Pack", credits: 30, price: 19 },
  { id: "power", name: "Power Pack", credits: 100, price: 49 },
];

interface CreditPackagesProps {
  onPurchase?: () => void;
}

const CreditPackages = ({ onPurchase }: CreditPackagesProps) => {
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (pkg: typeof packages[0]) => {
    if (!user) return;
    setPurchasing(pkg.id);

    try {
      if (pkg.id === "pro") {
        // Temporarily grant 30 credits for Pro Pack
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", user.id)
          .single();
        const newExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase
          .from("profiles")
          .update({
            credits: (profile?.credits ?? 0) + 30,
            credits_expire_at: newExpiry,
          })
          .eq("id", user.id);
        if (error) throw error;
        toast({ title: "Credits added!", description: "30 credits have been added to your account." });
        onPurchase?.();
      } else {
        toast({
          title: "Payment coming soon",
          description: "Credit purchases via payment will be available shortly.",
        });
      }
    } catch (err) {
      toast({
        title: "Purchase failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Get More Credits</h3>
      {packages.map((pkg) => (
        <button
          key={pkg.id}
          onClick={() => handlePurchase(pkg)}
          disabled={purchasing !== null}
          className="flex items-center justify-between rounded-2xl bg-surface p-4 card-depth text-left ease-presence transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{pkg.name}</p>
              <p className="text-[11px] text-muted-foreground">{pkg.credits} credits</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {purchasing === pkg.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <span className="text-sm font-semibold text-primary">${pkg.price}</span>
            )}
          </div>
        </button>
      ))}
      <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
        <Lock className="inline h-3 w-3 mr-0.5" />
        Secure payment processing
      </p>
    </div>
  );
};

export default CreditPackages;
