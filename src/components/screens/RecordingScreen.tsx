import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import VideoAvatar from "@/components/VideoAvatar";
import MicStatusIndicator from "@/components/MicStatusIndicator";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { PracticeMode } from "@/pages/Index";

const MAX_DURATION = 120;
const WARNING_THRESHOLD = 10;
const SESSION_MAX = 900; // 15 minutes

interface RecordingScreenProps {
  mode: PracticeMode;
  sessionStart: number;
  skipCountdown?: boolean;
  onStop: (transcript: string) => void;
  onBack: () => void;
}

const RecordingScreen = ({ mode, sessionStart, skipCountdown, onStop, onBack }: RecordingScreenProps) => {
  const [phase, setPhase] = useState<"countdown" | "recording">(skipCountdown ? "recording" : "countdown");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const stt = useSpeechToText();

  const remaining = MAX_DURATION - elapsed;

  // Start STT immediately if skipping countdown
  useEffect(() => {
    if (skipCountdown) {
      stt.start();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("recording");
      stt.start();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Elapsed timer
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Session timer
  useEffect(() => {
    const t = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [sessionStart]);

  // Auto-stop at session max (15 min)
  useEffect(() => {
    if (sessionElapsed >= SESSION_MAX && phase === "recording") {
      stt.stop();
      onStop(stt.transcript);
    }
  }, [sessionElapsed, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-stop at max
  useEffect(() => {
    if (phase === "recording" && elapsed >= MAX_DURATION) {
      stt.stop();
      onStop(stt.transcript);
    }
  }, [elapsed, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // 10-second warning
  useEffect(() => {
    if (phase === "recording" && remaining <= WARNING_THRESHOLD && remaining > 0 && !showWarning) {
      setShowWarning(true);
    }
  }, [remaining, phase, showWarning]);

  useEffect(() => {
    if (!showWarning) return;
    const t = setTimeout(() => setShowWarning(false), 3000);
    return () => clearTimeout(t);
  }, [showWarning]);

  const handleStop = useCallback(() => {
    stt.stop();
    onStop(stt.transcript);
  }, [stt, onStop]);

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
      <VideoAvatar state="listening" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/20 backdrop-blur-md ease-presence transition-transform active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground/80">{modeLabel}</span>
        <div className="flex items-center gap-2">
          {phase === "recording" && (
            <div className="rounded-full px-2.5 py-0.5 bg-background/20 backdrop-blur-md">
              <span className="tabular-nums text-[10px] font-medium text-foreground/60">
                Session: {formatTime(sessionElapsed)}
              </span>
            </div>
          )}
          {phase === "recording" ? (
            <div className={`rounded-full px-3 py-1 backdrop-blur-md transition-colors duration-300 ${
              remaining <= WARNING_THRESHOLD ? "bg-record/30" : "bg-background/20"
            }`}>
              <span className={`tabular-nums text-sm font-medium transition-colors duration-300 ${
                remaining <= WARNING_THRESHOLD ? "text-record" : "text-foreground"
              }`}>
                {formatTime(elapsed)}
              </span>
            </div>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* 10-second warning */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 z-20 rounded-full bg-record/90 px-4 py-1.5 backdrop-blur-md"
          >
            <span className="text-xs font-medium text-record-foreground">10 seconds remaining</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center countdown */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {phase === "countdown" && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 0.7 }}
              className="text-lg font-medium text-foreground/70"
            >
              Start talking in...
            </motion.p>
          )}
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
          {phase === "countdown" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              className="text-xs text-muted-foreground mt-2"
            >
              Each session lasts 15 minutes
            </motion.p>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex flex-col items-center gap-4 pb-12">
        {phase === "recording" && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-foreground/50">
            {stt.isListening ? "Listening…" : "Starting mic..."}
          </motion.p>
        )}
        <button
          onClick={phase === "recording" ? handleStop : undefined}
          disabled={phase !== "recording"}
          className={`flex h-16 w-16 items-center justify-center rounded-full ease-presence transition-all duration-250 will-change-transform active:scale-90 ${
            phase === "recording" ? "bg-record animate-pulse-record" : "bg-muted"
          }`}
        >
          {phase === "recording" ? (
            <div className="h-6 w-6 rounded-md bg-record-foreground" />
          ) : (
            <div className="h-4 w-4 rounded-full bg-muted-foreground/40" />
          )}
        </button>
        {phase === "recording" && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground">
            Tap to stop
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

export default RecordingScreen;
