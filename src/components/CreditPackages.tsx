import { Lock, Zap } from "lucide-react";
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
  const handlePurchase = () => {
    toast({
      title: "Payment coming soon",
      description: "Credit purchases via payment will be available shortly.",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Get More Credits</h3>
      {packages.map((pkg) => (
        <button
          key={pkg.id}
          onClick={handlePurchase}
          className="flex items-center justify-between rounded-2xl bg-surface p-4 card-depth text-left opacity-60 cursor-not-allowed"
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
          <span className="text-sm font-semibold text-primary">${pkg.price}</span>
        </button>
      ))}
      <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
        <Lock className="inline h-3 w-3 mr-0.5" />
        Secure payment processing
      </p>
      <p className="text-[10px] text-muted-foreground/50 text-center mt-1">
        All credits valid for 60 days · Top up anytime to extend your credits
      </p>
    </div>
  );
};

export default CreditPackages;
