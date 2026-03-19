import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFoundingUserSlots } from "@/hooks/useFoundingUser";
import { toast } from "@/hooks/use-toast";

interface PaywallPopupProps {
  open: boolean;
  onClose: () => void;
}

const packages = [
  { name: "Quick Credit", credits: 1, price: 2 },
  { name: "Starter Pack", credits: 10, price: 9 },
  { name: "Pro Pack", credits: 30, price: 19 },
  { name: "Power Pack", credits: 100, price: 49 },
];

const PaywallPopup = ({ open, onClose }: PaywallPopupProps) => {
  const { foundingUser } = useAuth();
  const slotsRemaining = useFoundingUserSlots();
  const showDiscount = foundingUser || (slotsRemaining !== null && slotsRemaining > 0);

  const handleUnlock = () => {
    toast({
      title: "Payment coming soon",
      description: "Credit purchases via payment will be available shortly.",
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-[60] flex items-end justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            className="w-full rounded-t-3xl bg-surface p-6 pb-10 card-depth"
          >
            {/* Close */}
            <div className="flex justify-end">
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-background/50">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Icon */}
            <div className="mt-2 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Zap className="h-8 w-8 text-primary" />
              </div>
            </div>

            {/* Title */}
            <h3 className="mt-4 text-center text-lg font-semibold text-foreground">
              Unlock more sessions
            </h3>
            <p className="mt-2 text-center text-xs text-muted-foreground leading-relaxed">
              Keep practicing and improve how you think and respond under pressure.
            </p>

            {/* Founding offer */}
            {showDiscount && (
              <div className="mt-4 rounded-2xl bg-primary/10 border border-primary/20 p-3 text-center">
                <p className="text-xs font-medium text-primary">
                  🎉 {foundingUser ? "Your 50% founding discount is applied!" : "Founding users get 50% lifetime discount"}
                </p>
                {!foundingUser && (
                  <p className="text-[11px] text-primary/80 mt-1">
                    Limited to first 100 paying users · 🔥 Only {slotsRemaining} spots left
                  </p>
                )}
              </div>
            )}

            {/* Sample pricing */}
            <div className="mt-4 flex flex-col gap-2">
              {packages.slice(0, 2).map((pkg) => {
                const discounted = Math.round(pkg.price * 50) / 100;
                return (
                  <div key={pkg.name} className="flex items-center justify-between rounded-xl bg-background/50 px-4 py-2.5">
                    <div>
                      <p className="text-xs font-medium text-foreground">{pkg.name}</p>
                      <p className="text-[10px] text-muted-foreground">{pkg.credits} credits</p>
                    </div>
                    {showDiscount ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground line-through">${pkg.price}</span>
                        <span className="text-sm font-semibold text-primary">${discounted}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-primary">${pkg.price}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <button
              onClick={handleUnlock}
              className="mt-5 h-12 w-full rounded-2xl bg-primary text-primary-foreground font-medium ease-presence transition-transform active:scale-95"
            >
              {showDiscount ? "Unlock with 50% discount" : "Unlock more sessions"}
            </button>

            <button
              onClick={onClose}
              className="mt-2 h-10 w-full rounded-2xl text-muted-foreground text-sm font-medium"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallPopup;
