import { motion } from "framer-motion";
import { Mic, Target, MessageSquare, Zap, RefreshCw, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import onboardingBg from "@/assets/onboarding-bg.jpg";

const TIPS = [
  {
    icon: <Mic className="h-4 w-4" />,
    text: "Speak out loud (don't just think)",
    description: "Vocalizing your thoughts helps build muscle memory and improves clarity.",
  },
  {
    icon: <Target className="h-4 w-4" />,
    text: "Be specific, not general",
    description: "Use concrete examples and data points to back up your statements.",
  },
  {
    icon: <MessageSquare className="h-4 w-4" />,
    text: "Treat it like a real conversation",
    description: "Engage with the AI as you would with a professional colleague.",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    text: "Don't aim for perfect — aim for clarity",
    description: "It's better to be clear and concise than complex and confusing.",
  },
  {
    icon: <RefreshCw className="h-4 w-4" />,
    text: "Repeat sessions to improve",
    description: "Consistency is key. Revisit topics to refine your delivery.",
  },
];

const Onboarding = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    localStorage.setItem("onboarding_complete", "true");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="relative mx-auto h-[812px] w-[375px] overflow-hidden rounded-4xl border border-border bg-background shadow-2xl">
        {/* Status bar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 pt-3 pb-1">
          <span className="text-xs font-medium text-foreground">9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-4 rounded-sm border border-foreground/40 relative">
              <div className="absolute inset-[2px] right-[3px] rounded-[1px] bg-foreground/60" />
            </div>
          </div>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-[120px] h-[30px] bg-background rounded-b-2xl" />

        <div className="flex h-full flex-col overflow-y-auto">
          {/* Hero image */}
          <div className="relative h-[260px] w-full shrink-0 overflow-hidden">
            <img
              src={onboardingBg}
              alt="Think2Talk onboarding"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
            <div className="absolute top-14 left-0 right-0 flex justify-center">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="h-2 w-2 rounded-full bg-primary/60" />
                  <div className="h-2 w-2 rounded-full bg-primary/30" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/80">
                  Think2Talk
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col px-6 pb-8 -mt-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Pro Guidance
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-foreground leading-tight">
                How to get the most out of Think2Talk
              </h1>
            </motion.div>

            {/* Tips */}
            <div className="mt-6 flex flex-col gap-3">
              {TIPS.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.07, duration: 0.35 }}
                  className="flex items-start gap-3 rounded-2xl bg-surface p-3.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {tip.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {tip.text}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {tip.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom section */}
            <div className="mt-6 flex flex-col items-center gap-4">
              <p className="text-center text-xs text-muted-foreground italic">
                "Practice speaking. Train your thinking like a pro"
              </p>
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.3 }}
                onClick={handleStart}
                className="h-14 w-full rounded-2xl bg-foreground text-background font-medium text-base transition-transform active:scale-[0.97]"
              >
                Got it, let's start
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
