import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import coachSpeaking from "@/assets/coach-speaking.jpg";
import coachThinking from "@/assets/coach-thinking.jpg";
import type { PracticeMode } from "@/pages/Index";

const challengePrompts = [
  "Why does that matter?",
  "What evidence supports this?",
  "Is that the strongest version of your point?",
  "Can you give a specific example?",
];

interface FeedbackScreenProps {
  mode: PracticeMode;
  onFinish: () => void;
  onBack: () => void;
}

const FeedbackScreen = ({ onFinish, onBack }: FeedbackScreenProps) => {
  const [phase, setPhase] = useState<"thinking" | "speaking" | "listening">("thinking");
  const [promptIndex] = useState(() => Math.floor(Math.random() * challengePrompts.length));
  const [responseTimer, setResponseTimer] = useState(0);

  // Simulate coach thinking then speaking
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("speaking"), 1500);
    const t2 = setTimeout(() => setPhase("listening"), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== "listening") return;
    const t = setInterval(() => setResponseTimer(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="relative flex h-full flex-col"
    >
      {/* Full-bleed avatar */}
      <img
        src={phase === "thinking" ? coachThinking : coachSpeaking}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background/90" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/20 backdrop-blur-md ease-presence transition-transform active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground/80">
          {phase === "thinking" ? "" : phase === "speaking" ? "Speaking" : "Your turn"}
        </span>
        {phase === "listening" ? (
          <div className="rounded-full bg-background/20 px-3 py-1 backdrop-blur-md">
            <span className="tabular-nums text-sm font-medium text-foreground">
              {formatTime(responseTimer)}
            </span>
          </div>
        ) : (
          <div className="w-10" />
        )}
      </div>

      <div className="relative z-10 flex flex-1 items-end justify-center pb-4">
        <AnimatePresence mode="wait">
          {phase === "speaking" && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              className="rounded-3xl bg-background/30 px-6 py-4 backdrop-blur-xl"
            >
              <p className="text-center text-xl font-medium text-foreground text-pretty">
                "{challengePrompts[promptIndex]}"
              </p>
            </motion.div>
          )}
          {phase === "thinking" && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl bg-background/30 px-6 py-3 backdrop-blur-xl"
            >
              <p className="text-sm text-muted-foreground">Considering your response...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex flex-col items-center gap-4 pb-12">
        {phase === "listening" ? (
          <>
            <button
              onClick={onFinish}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-record animate-pulse-record ease-presence will-change-transform active:scale-90"
            >
              <div className="h-6 w-6 rounded-md bg-record-foreground" />
            </button>
            <span className="text-xs text-muted-foreground">Tap to finish</span>
          </>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <div className="h-5 w-5 rounded-full bg-primary animate-pulse-listen" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FeedbackScreen;
