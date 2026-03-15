import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle } from "lucide-react";
import VideoAvatar from "@/components/VideoAvatar";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { supabase } from "@/integrations/supabase/client";
import type { PracticeMode, ConversationEntry } from "@/pages/Index";

const RESPONSE_MAX = 60;
const RESPONSE_WARNING = 10;

const fallbackPrompts: Record<string, string[]> = {
  debate: [
    "What is your strongest argument for your position?",
    "What would a skeptic say?",
    "What evidence supports this claim?",
  ],
  interview: [
    "How would you answer this question convincingly in a real interview?",
    "Can you give a specific example?",
    "What makes you the best candidate?",
  ],
  pitch: [
    "Why should someone invest in this idea?",
    "What differentiates this from competitors?",
    "How big is the market opportunity?",
  ],
  presentation: [
    "What is the main takeaway you want your audience to remember?",
    "How does this connect to the bigger picture?",
    "Could you be more precise about that?",
  ],
};

interface FeedbackScreenProps {
  mode: PracticeMode;
  initialTranscript: string;
  initialConversationLog: ConversationEntry[];
  onFinish: (conversationLog: ConversationEntry[]) => void;
  onBack: () => void;
}

type Phase = "thinking" | "speaking" | "responding";

const FeedbackScreen = ({ mode, initialTranscript, initialConversationLog, onFinish, onBack }: FeedbackScreenProps) => {
  const [phase, setPhase] = useState<Phase>("thinking");
  const [round, setRound] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [responseTimer, setResponseTimer] = useState(0);
  const [previousChallenges, setPreviousChallenges] = useState<string[]>([]);
  const conversationLogRef = useRef<ConversationEntry[]>([...initialConversationLog]);
  const latestTranscriptRef = useRef(initialTranscript);
  const stt = useSpeechToText();
  const tts = useTextToSpeech();

  const remaining = RESPONSE_MAX - responseTimer;

  const generateChallenge = useCallback(
    async (transcript: string) => {
      try {
      const { data, error } = await supabase.functions.invoke("generate-challenge", {
          body: { transcript, mode, previousChallenges, roundNumber: round },
        });

        if (error) throw error;
        return data?.challenge as string | undefined;
      } catch (e) {
        console.error("Challenge generation failed:", e);
        return undefined;
      }
    },
    [mode, previousChallenges]
  );

  const getFallback = useCallback(() => {
    const pool = fallbackPrompts[mode] || fallbackPrompts.debate;
    const unused = pool.filter((p) => !previousChallenges.includes(p));
    const list = unused.length > 0 ? unused : pool;
    return list[Math.floor(Math.random() * list.length)];
  }, [mode, previousChallenges]);

  // Each round: thinking → speaking (with TTS) → responding
  useEffect(() => {
    let cancelled = false;

    setPhase("thinking");
    setResponseTimer(0);

    const run = async () => {
      const transcript = latestTranscriptRef.current;
      const challenge = await generateChallenge(transcript);
      if (cancelled) return;

      const prompt = challenge || getFallback();
      setCurrentPrompt(prompt);
      setPreviousChallenges((prev) => [...prev, prompt]);

      // Log the challenge
      conversationLogRef.current.push({
        role: "challenge",
        text: prompt,
        round: round + 1,
      });

      setPhase("speaking");

      // Speak the challenge aloud; wait for it to finish
      await tts.speak(prompt);
      if (cancelled) return;

      // Small pause after speech ends before mic activates
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;

      setPhase("responding");
      stt.start();
    };

    run();
    return () => {
      cancelled = true;
      tts.cancel();
    };
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  // Response timer
  useEffect(() => {
    if (phase !== "responding") return;
    const t = setInterval(() => setResponseTimer((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Auto-stop at max → next round
  useEffect(() => {
    if (phase === "responding" && responseTimer >= RESPONSE_MAX) {
      const text = stt.stop();
      const userResponse = text || stt.transcript;
      latestTranscriptRef.current = userResponse;

      // Log user response
      conversationLogRef.current.push({
        role: "user",
        text: userResponse,
        round: round + 1,
      });

      setRound((r) => r + 1);
    }
  }, [responseTimer, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStopResponse = () => {
    const text = stt.stop();
    const userResponse = text || stt.transcript;
    latestTranscriptRef.current = userResponse;

    // Log user response
    conversationLogRef.current.push({
      role: "user",
      text: userResponse,
      round: round + 1,
    });

    setRound((r) => r + 1);
  };

  const handleFinish = () => {
    tts.cancel();
    stt.stop();
    onFinish(conversationLogRef.current);
  };

  const handleBack = () => {
    tts.cancel();
    stt.stop();
    onBack();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const avatarState =
    phase === "thinking" ? "thinking" : phase === "speaking" ? "speaking" : "listening";

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

        <div className="flex items-center gap-2">
          {round > 0 && (
            <span className="rounded-full bg-background/20 px-2.5 py-0.5 text-[10px] font-medium text-foreground/60 backdrop-blur-md">
              Round {round + 1}
            </span>
          )}
        </div>

        {phase === "responding" ? (
          <div
            className={`rounded-full px-3 py-1 backdrop-blur-md transition-colors duration-300 ${
              remaining <= RESPONSE_WARNING ? "bg-record/30" : "bg-background/20"
            }`}
          >
            <span
              className={`tabular-nums text-sm font-medium transition-colors duration-300 ${
                remaining <= RESPONSE_WARNING ? "text-record" : "text-foreground"
              }`}
            >
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

      {/* Bottom controls */}
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

        {/* Finish Session */}
        <button
          onClick={handleFinish}
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
