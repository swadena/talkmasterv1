import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import coachAvatar from "@/assets/coach-avatar.jpg";
import type { PracticeMode } from "@/pages/Index";

interface RecordingScreenProps {
  mode: PracticeMode;
  onStop: () => void;
  onBack: () => void;
}

const RecordingScreen = ({ mode, onStop, onBack }: RecordingScreenProps) => {
  const [phase, setPhase] = useState<"countdown" | "recording">("countdown");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("recording");
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }, []);

  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

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
        src={coachAvatar}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background/80" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/20 backdrop-blur-md ease-presence transition-transform active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground/80">{modeLabel}</span>
        {phase === "recording" ? (
          <div className="rounded-full bg-background/20 px-3 py-1 backdrop-blur-md">
            <span className="tabular-nums text-sm font-medium text-foreground">
              {formatTime(elapsed)}
            </span>
          </div>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === "countdown" && countdown > 0 && (
            <motion.span
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.9 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
              className="text-8xl font-light text-foreground/80"
            >
              {countdown}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex flex-col items-center gap-4 pb-12">
        {phase === "recording" && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-foreground/50"
          >
            Listening...
          </motion.p>
        )}

        <button
          onClick={phase === "recording" ? onStop : undefined}
          disabled={phase !== "recording"}
          className={`flex h-16 w-16 items-center justify-center rounded-full ease-presence transition-all duration-250 will-change-transform active:scale-90 ${
            phase === "recording"
              ? "bg-record animate-pulse-record"
              : "bg-muted"
          }`}
        >
          {phase === "recording" ? (
            <div className="h-6 w-6 rounded-md bg-record-foreground" />
          ) : (
            <div className="h-4 w-4 rounded-full bg-muted-foreground/40" />
          )}
        </button>

        {phase === "recording" && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground"
          >
            Tap to stop
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

export default RecordingScreen;
