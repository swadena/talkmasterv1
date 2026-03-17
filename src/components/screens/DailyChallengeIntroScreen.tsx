import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import VideoAvatar from "@/components/VideoAvatar";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

const DAILY_TOPICS = [
  "Should companies adopt a 4-day workweek?",
  "Is social media doing more harm than good to society?",
  "Should university education be free for everyone?",
  "Is remote work better than working from an office?",
  "Should voting be mandatory in democracies?",
  "Is artificial intelligence a threat to human jobs?",
  "Should governments ban single-use plastics entirely?",
  "Is it ethical to use animals for scientific research?",
  "Should there be a universal basic income for all citizens?",
  "Is space exploration worth the investment?",
  "Should smartphones be banned in schools?",
  "Is cancel culture a positive or negative force?",
  "Should parents limit screen time for children?",
  "Is it better to be a specialist or a generalist in your career?",
  "Should countries prioritize economic growth or environmental protection?",
  "Is it ethical for companies to collect personal data?",
  "Should there be age limits for social media use?",
  "Is competition or collaboration more important for success?",
  "Should wealthy nations accept more refugees?",
  "Is a college degree still worth it in today's economy?",
];

function getDailyTopic(): string {
  // Use date as seed so the topic stays the same all day
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return DAILY_TOPICS[seed % DAILY_TOPICS.length];
}

interface DailyChallengeIntroScreenProps {
  onReady: (topic: string) => void;
  onBack: () => void;
}

type Phase = "speaking" | "countdown";

const DailyChallengeIntroScreen = ({ onReady, onBack }: DailyChallengeIntroScreenProps) => {
  const [phase, setPhase] = useState<Phase>("speaking");
  const [countdown, setCountdown] = useState(3);
  const [topic] = useState(() => getDailyTopic());
  const tts = useTextToSpeech();

  const introMessage = `Welcome! Your topic today is: ${topic}. You have 15 seconds to prepare and start speaking.`;

  // Speak the intro, then start countdown
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await tts.speak(introMessage);
      if (cancelled) return;
      setPhase("countdown");
    };

    run();
    return () => {
      cancelled = true;
      tts.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      onReady(topic);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase, onReady, topic]);

  const handleBack = () => {
    tts.cancel();
    onBack();
  };

  const avatarState = phase === "speaking" ? "speaking" : "listening";

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
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/20 backdrop-blur-md ease-presence transition-transform active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground/80">Daily Challenge</span>
        <div className="w-10" />
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        {/* Topic card — always visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="mx-2 rounded-3xl bg-background/30 px-6 py-5 backdrop-blur-xl"
        >
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-primary mb-3">
            Today's Topic
          </p>
          <p className="text-center text-xl font-medium text-foreground text-pretty leading-relaxed">
            "{topic}"
          </p>
        </motion.div>

        {/* Countdown section */}
        <AnimatePresence mode="wait">
          {phase === "countdown" && (
            <motion.div
              key="countdown-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8 flex flex-col items-center gap-3"
            >
              <p className="text-sm font-medium text-foreground/70">
                {countdown > 3 ? "Prepare your thoughts..." : "Start talking in..."}
              </p>
              <motion.span
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.9 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                className={`text-7xl font-light ${
                  countdown <= 3 ? "text-primary" : "text-foreground/60"
                }`}
              >
                {countdown}
              </motion.span>
            </motion.div>
          )}
          {phase === "speaking" && (
            <motion.div
              key="speaking-status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <p className="text-sm text-muted-foreground animate-pulse">Coach is speaking...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom */}
      <div className="relative z-10 flex flex-col items-center gap-2 pb-12">
        <p className="text-[10px] text-muted-foreground/50">
          {phase === "countdown"
            ? "Recording starts automatically"
            : "Listen to your coach"}
        </p>
      </div>
    </motion.div>
  );
};

export default DailyChallengeIntroScreen;
