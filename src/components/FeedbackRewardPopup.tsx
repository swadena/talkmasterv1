import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const USEFUL_OPTIONS = [
  "Practicing speaking",
  "Thinking more clearly",
  "The questions/challenges",
  "The AI feedback",
  "I'm not sure yet",
];

const PAY_OPTIONS = ["Yes", "Maybe", "No"];

interface FeedbackRewardPopupProps {
  open: boolean;
  onClose: () => void;
}

const FeedbackRewardPopup = ({ open, onClose }: FeedbackRewardPopupProps) => {
  const { refreshCredits } = useAuth();
  const [mostUseful, setMostUseful] = useState("");
  const [frustration, setFrustration] = useState("");
  const [wouldPay, setWouldPay] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSkip = async () => {
    // Mark skipped once
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from("profiles")
        .update({ feedback_skipped_once: true } as any)
        .eq("id", session.user.id);
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (!mostUseful || !wouldPay) {
      toast({ title: "Please answer all required questions", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-feedback", {
        body: {
          most_useful: mostUseful,
          frustration: frustration || "(none)",
          would_pay: wouldPay,
        },
      });

      if (error) throw error;

      await refreshCredits();
      toast({ title: "🎉 +1 credit added!", description: "Thanks for your feedback." });
      onClose();
    } catch (e) {
      console.error(e);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="mx-4 w-full max-w-[340px] rounded-3xl bg-card p-5 card-depth overflow-y-auto max-h-[700px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20">
                  <Gift className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Get 1 free credit</h3>
                  <p className="text-[10px] text-muted-foreground">Give feedback to improve your experience</p>
                </div>
              </div>
              <button onClick={handleSkip} className="p-1 rounded-lg hover:bg-surface transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Q1: Most useful */}
            <div className="mb-4">
              <p className="text-xs font-medium text-foreground mb-2">What did you find most useful?</p>
              <RadioGroup value={mostUseful} onValueChange={setMostUseful} className="gap-1.5">
                {USEFUL_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs cursor-pointer transition-colors ${
                      mostUseful === opt ? "bg-primary/10 text-foreground" : "bg-surface text-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value={opt} className="h-3.5 w-3.5" />
                    {opt}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Q2: Frustration */}
            <div className="mb-4">
              <p className="text-xs font-medium text-foreground mb-2">What felt confusing or frustrating?</p>
              <textarea
                value={frustration}
                onChange={(e) => setFrustration(e.target.value)}
                placeholder="Optional — share anything"
                className="w-full rounded-xl bg-surface p-3 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Q3: Would pay */}
            <div className="mb-5">
              <p className="text-xs font-medium text-foreground mb-2">Would you pay to keep using this?</p>
              <RadioGroup value={wouldPay} onValueChange={setWouldPay} className="flex gap-2">
                {PAY_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                      wouldPay === opt ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value={opt} className="sr-only" />
                    {opt}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-11 w-full rounded-2xl bg-foreground text-background text-sm font-medium ease-presence transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Submit & Claim Credit</>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackRewardPopup;
