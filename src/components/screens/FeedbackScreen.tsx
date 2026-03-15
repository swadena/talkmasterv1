import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle } from "lucide-react";
import VideoAvatar from "@/components/VideoAvatar";
import type { PracticeMode } from "@/pages/Index";

const challengePrompts = [
  "Why does that matter?",
  "What evidence supports this claim?",
  "Is that the strongest version of your point?",
  "Can you give a specific example?",
  "What would a skeptic say?",
  "How does this connect to the bigger picture?",
  "What's the counter-argument?",
  "Could you be more precise about that?",
];

const RESPONSE_MAX = 60;
const RESPONSE_WARNING = 10;

interface FeedbackScreenProps {
  mode: PracticeMode;
  onFinish: () => void;
  onBack: () => void;
}

// thinking → speaking (AI delivers challenge) → responding (user talks) → loop
type Phase = "thinking" | "speaking" | "responding";

const FeedbackScreen = ({ onFinish, onBack }: FeedbackScreenProps) => {
  const [phase, setPhase] = useState<Phase>("thinking");
  const [round, setRound] = useState(0);
  const [usedPrompts, setUsedPrompts] = useState<number[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [responseTimer, setResponseTimer] = useState(0);

  const remaining = RESPONSE_MAX - responseTimer;

  const pickPrompt = useCallback(() => {
    const available = challengePrompts.map((_, i) => i).filter(i => !usedPrompts.includes(i));
    const pool = available.length > 0 ? available : challengePrompts.map((_, i) => i);
    const idx = pool[Math.floor(Math.random() * pool.length)];
    setUsedPrompts(prev => [...prev, idx]);
    setCurrentPrompt(challengePrompts[idx]);
  }, [usedPrompts]);

  // Each round: thinking → speaking → responding (auto-ready mic)
  useEffect(() => {
    setPhase("thinking");
    setResponseTimer(0);
    pickPrompt();

    const t1 = setTimeout(() => setPhase("speaking"), 1500);
    // After "speaking" for 3s, auto-transition to responding (mic ready)
    const t2 = setTimeout(() => setPhase("responding"), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  // Response timer
  useEffect(() => {
    if (phase !== "responding") return;
    const t = setInterval(() => setResponseTimer(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Auto-stop at max → next round automatically
  useEffect(() => {
    if (phase === "responding" && responseTimer >= RESPONSE_MAX) {
      setRound(r => r + 1);
    }
  }, [responseTimer, phase]);

  const handleStopResponse = () => {
    // User stops talking → next round (AI challenges again)
    setRound(r => r + 1);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const avatarState = phase === "thinking" ? "thinking" : phase === "speaking" ? "speaking" : "listening";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="relative flex h-full flex-col"
    >
      <VideoAvatar state={avatarState} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/20 backdrop-blur-md ease-presence transition-transform active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex items-center gap-2">
          {round > 0 && (
            <span className="rounded-full bg-background/20 px-2.5 py-0.5 text-[10px] font-medium text-foreground/60 backdrop-blur-md">
              Round {round + 1}
            </span>
          )}
        </div>

        {phase === "responding" ? (
          <div className={`rounded-full px-3 py-1 backdrop-blur-md transition-colors duration-300 ${
            remaining <= RESPONSE_WARNING ? "bg-record/30" : "bg-background/20"
          }`}>
            <span className={`tabular-nums text-sm font-medium transition-colors duration-300 ${
              remaining <= RESPONSE_WARNING ? "text-record" : "text-foreground"
            }`}>
              {formatTime(responseTimer)}
            </span>
          </div>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Center: challenge prompt or status */}
      <div className="relative z-10 flex flex-1 items-end justify-center pb-4">
        <AnimatePresence mode="wait">
          {phase === "speaking" && (
            <motion.div
              key={`prompt-${round}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              className="mx-6 rounded-3xl bg-background/30 px-6 py-4 backdrop-blur-xl"
            >
              <p className="text-center text-xl font-medium text-foreground text-pretty">
                "{currentPrompt}"
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
          {phase === "responding" && (
            <motion.div
              key="responding"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-background/20 px-5 py-2.5 backdrop-blur-xl"
            >
              <p className="text-xs text-foreground/50">Listening...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls — natural conversation flow */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 pb-10">
        <AnimatePresence mode="wait">
          {phase === "responding" ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-center gap-3"
            >
              <button
                onClick={handleStopResponse}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-record animate-pulse-record ease-presence will-change-transform active:scale-90"
              >
                <div className="h-6 w-6 rounded-md bg-record-foreground" />
              </button>
              <span className="text-xs text-muted-foreground">Tap to respond · 1 min max</span>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20"
            >
              <div className="h-5 w-5 rounded-full bg-primary animate-pulse-listen" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finish Session — always visible */}
        <button
          onClick={onFinish}
          className="mt-2 flex items-center gap-1.5 rounded-full bg-background/20 px-4 py-2 backdrop-blur-md ease-presence transition-transform active:scale-95"
        >
          <CheckCircle className="h-3.5 w-3.5 text-success" />
          <span className="text-xs font-medium text-foreground/70">Finish Session</span>
        </button>
      </div>
    </motion.div>
  );
};

export default FeedbackScreen;
