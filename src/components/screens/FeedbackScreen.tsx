import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle, Loader2, RefreshCw, SkipForward, ArrowRight } from "lucide-react";
import MicStatusIndicator from "@/components/MicStatusIndicator";
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
  daily_challenge: [
    "What's your initial take on this topic?",
    "Can you give a real-world example to support your point?",
    "What would someone who disagrees with you say?",
  ],
};

const SESSION_MAX = 900; // 15 minutes

interface FeedbackScreenProps {
  mode: PracticeMode;
  sessionStart: number;
  initialTranscript: string;
  initialConversationLog: ConversationEntry[];
  dailyTopic?: string;
  onFinish: (conversationLog: ConversationEntry[]) => void;
  onBack: () => void;
}

type Phase = "thinking" | "speaking" | "responding" | "farewell" | "fallback";

const FAREWELL_MESSAGE = "Thanks for practicing today! See you next time. You can also finish early anytime by pressing the Finish Session button.";

const FeedbackScreen = ({ mode, sessionStart, initialTranscript, initialConversationLog, dailyTopic, onFinish, onBack }: FeedbackScreenProps) => {
  const [phase, setPhase] = useState<Phase>("thinking");
  const [round, setRound] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [responseTimer, setResponseTimer] = useState(0);
  const [previousChallenges, setPreviousChallenges] = useState<string[]>([]);
  const [exitAssuranceAsked, setExitAssuranceAsked] = useState(false);
  const conversationLogRef = useRef<ConversationEntry[]>([...initialConversationLog]);
  const latestTranscriptRef = useRef(initialTranscript);
  const stt = useSpeechToText();
  const tts = useTextToSpeech();
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [thinkingElapsed, setThinkingElapsed] = useState(0);
  const pausedTimeRef = useRef(0);
  const thinkingStartRef = useRef(0);

  const remaining = RESPONSE_MAX - responseTimer;

  // Session timer — pauses during thinking/fallback phases
  useEffect(() => {
    if (phase === "thinking" || phase === "fallback") return;
    const t = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStart - pausedTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [sessionStart, phase]);

  // Track thinking elapsed time for staged UI
  useEffect(() => {
    if (phase === "thinking") {
      thinkingStartRef.current = Date.now();
      setThinkingElapsed(0);
      const t = setInterval(() => {
        setThinkingElapsed(Math.floor((Date.now() - thinkingStartRef.current) / 1000));
      }, 500);
      return () => clearInterval(t);
    } else if (phase === "fallback") {
      // don't reset
    } else {
      // Accumulate paused time when leaving thinking/fallback
      if (thinkingStartRef.current > 0) {
        pausedTimeRef.current += Date.now() - thinkingStartRef.current;
        thinkingStartRef.current = 0;
      }
    }
  }, [phase]);

  // Auto-fallback after 5 seconds of thinking
  useEffect(() => {
    if (phase === "thinking" && thinkingElapsed >= 5) {
      setPhase("fallback");
    }
  }, [phase, thinkingElapsed]);

  const thinkingLabel = useMemo(() => {
    if (thinkingElapsed >= 2) return "Almost ready...";
    return "Considering your response...";
  }, [thinkingElapsed]);

  // Auto-finish at session max (15 min)
  useEffect(() => {
    if (sessionElapsed >= SESSION_MAX) {
      tts.cancel();
      stt.stop();
      onFinish(conversationLogRef.current);
    }
  }, [sessionElapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateChallenge = useCallback(
    async (transcript: string) => {
      try {
      const { data, error } = await supabase.functions.invoke("generate-challenge", {
          body: { transcript, mode, previousChallenges, roundNumber: round, dailyTopic },
        });

        if (error) throw error;
        return data as { challenge?: string; exitIntent?: boolean; questionType?: string } | undefined;
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

  // Farewell: speak farewell then finish
  const startFarewell = useCallback(async () => {
    setPhase("farewell");
    setCurrentPrompt(FAREWELL_MESSAGE);
    conversationLogRef.current.push({ role: "challenge", text: FAREWELL_MESSAGE, round: round + 1 });
    await tts.speak(FAREWELL_MESSAGE);
    // Auto-finish after farewell
    onFinish(conversationLogRef.current);
  }, [round, tts, onFinish]);

  // Retry handler for fallback
  const handleRetry = useCallback(() => {
    setPhase("thinking");
    setThinkingElapsed(0);
    // Re-trigger the round effect by bumping a retry counter
    setRetryCount((c) => c + 1);
  }, []);

  const handleSkipToNext = useCallback(() => {
    const prompt = getFallback();
    setCurrentPrompt(prompt);
    setPreviousChallenges((prev) => [...prev, prompt]);
    conversationLogRef.current.push({ role: "challenge", text: prompt, round: round + 1 });
    // Accumulate paused time
    if (thinkingStartRef.current > 0) {
      pausedTimeRef.current += Date.now() - thinkingStartRef.current;
      thinkingStartRef.current = 0;
    }
    setPhase("speaking");
    tts.speak(prompt).then(() => {
      return new Promise((r) => setTimeout(r, 600));
    }).then(() => {
      setPhase("responding");
      stt.start();
    });
  }, [getFallback, round, tts, stt]);

  const handleContinueWithoutFeedback = useCallback(() => {
    // Accumulate paused time
    if (thinkingStartRef.current > 0) {
      pausedTimeRef.current += Date.now() - thinkingStartRef.current;
      thinkingStartRef.current = 0;
    }
    setPhase("responding");
    stt.start();
  }, [stt]);

  const [retryCount, setRetryCount] = useState(0);

  // Each round: thinking → speaking (with TTS) → responding
  useEffect(() => {
    let cancelled = false;

    if (phase !== "thinking") return;
    setResponseTimer(0);

    const run = async () => {
      const transcript = latestTranscriptRef.current;
      const result = await generateChallenge(transcript);
      if (cancelled) return;
      // If we've already moved to fallback, don't proceed
      if (phase !== "thinking") return;

      // Handle exit intent
      if (result?.exitIntent) {
        if (!exitAssuranceAsked) {
          setExitAssuranceAsked(true);
          const assurancePrompt = result.challenge || "I understand you'd like to wrap up. Is there anything you'd like to share before we finish?";
          setCurrentPrompt(assurancePrompt);
          setPreviousChallenges((prev) => [...prev, assurancePrompt]);
          conversationLogRef.current.push({ role: "challenge", text: assurancePrompt, round: round + 1 });

          setPhase("speaking");
          await tts.speak(assurancePrompt);
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, 600));
          if (cancelled) return;
          setPhase("responding");
          stt.start();
        } else {
          if (!cancelled) await startFarewell();
        }
        return;
      }

      const prompt = result?.challenge || getFallback();
      setCurrentPrompt(prompt);
      setPreviousChallenges((prev) => [...prev, prompt]);

      conversationLogRef.current.push({
        role: "challenge",
        text: prompt,
        round: round + 1,
      });

      setPhase("speaking");

      await tts.speak(prompt);
      if (cancelled) return;

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
  }, [round, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

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
    phase === "thinking" ? "thinking" : phase === "speaking" || phase === "farewell" ? "speaking" : "listening";

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/20 backdrop-blur-md ease-presence transition-transform active:scale-95"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="rounded-full px-2.5 py-0.5 bg-background/20 backdrop-blur-md">
            <span className="tabular-nums text-[10px] font-medium text-foreground/60">
              Session: {formatTime(sessionElapsed)}
            </span>
          </div>
        </div>

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
          {(phase === "speaking" || phase === "farewell") && (
            <motion.div
              key={`prompt-${round}-${phase}`}
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
              className="rounded-3xl bg-background/30 px-6 py-3 backdrop-blur-xl flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{thinkingLabel}</p>
            </motion.div>
          )}
          {phase === "fallback" && (
            <motion.div
              key="fallback"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-6 flex flex-col items-center gap-3"
            >
              <div className="rounded-3xl bg-background/30 px-6 py-4 backdrop-blur-xl">
                <p className="text-center text-sm text-muted-foreground">
                  This is taking longer than expected.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[260px]">
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-primary/90 px-4 py-2.5 text-sm font-medium text-primary-foreground backdrop-blur-md transition-transform active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry analysis
                </button>
                <button
                  onClick={handleSkipToNext}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-background/30 px-4 py-2.5 text-sm font-medium text-foreground/80 backdrop-blur-md transition-transform active:scale-95"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip to next question
                </button>
                <button
                  onClick={handleContinueWithoutFeedback}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-background/20 px-4 py-2.5 text-sm font-medium text-foreground/60 backdrop-blur-md transition-transform active:scale-95"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Continue without feedback
                </button>
              </div>
            </motion.div>
          )}
          {phase === "responding" && (
            <motion.div
              key="responding"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="rounded-3xl bg-background/20 px-5 py-2.5 backdrop-blur-xl">
                <p className="text-xs text-foreground/50">Listening…</p>
              </div>
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
              <span className="text-xs text-muted-foreground">Tap to stop · 1 min max</span>
            </motion.div>
          ) : null}
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
