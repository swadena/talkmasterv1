import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, CheckCircle2, Loader2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PracticeMode, ConversationEntry } from "@/pages/Index";

interface Assessment {
  scores: {
    clarity: number;
    logic: number;
    evidence: number;
    confidence: number;
    pacing: number;
    filler_words: number;
  };
  feedback: {
    clarity: string;
    logic: string;
    evidence: string;
    confidence: string;
    pacing: string;
    filler_words: string;
  };
  tips: string[];
}

interface SummaryScreenProps {
  mode: PracticeMode;
  conversationLog: ConversationEntry[];
  onNewSession: () => void;
  onBack: () => void;
  onSessionComplete?: (assessment: Assessment | null) => Promise<void>;
}

const formatConversationLog = (log: ConversationEntry[]): string => {
  return log
    .map((entry) => {
      if (entry.role === "user") {
        return `[User Response - Round ${entry.round}]:\n${entry.text}`;
      }
      return `[Challenge Question - Round ${entry.round}]:\n${entry.text}`;
    })
    .join("\n\n");
};

const METRIC_KEYS: { key: keyof Assessment["scores"]; label: string }[] = [
  { key: "clarity", label: "Clarity" },
  { key: "logic", label: "Logic" },
  { key: "evidence", label: "Evidence" },
  { key: "confidence", label: "Confidence" },
  { key: "pacing", label: "Pacing" },
  { key: "filler_words", label: "Filler Words" },
];

const SummaryScreen = ({ mode, conversationLog, onNewSession, onBack, onSessionComplete }: SummaryScreenProps) => {
  const navigate = useNavigate();
  const { credits } = useAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionSaved = useRef(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const logText = formatConversationLog(conversationLog);
        const { data, error: fnError } = await supabase.functions.invoke("assess-session", {
          body: { conversationLog: logText, mode },
        });

        if (fnError) throw fnError;
        const result = data as Assessment;
        setAssessment(result);

        // Save session once
        if (!sessionSaved.current && onSessionComplete) {
          sessionSaved.current = true;
          await onSessionComplete(result);
        }
      } catch (e) {
        console.error("Assessment failed:", e);
        setError("Could not generate assessment. Please try again.");
        if (!sessionSaved.current && onSessionComplete) {
          sessionSaved.current = true;
          await onSessionComplete(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [conversationLog, mode]);

  const metrics = assessment?.scores && assessment?.feedback
    ? METRIC_KEYS.map(({ key, label }) => ({
        label,
        score: assessment.scores[key] ?? 0,
        max: 10,
        feedback: assessment.feedback[key] ?? "",
      }))
    : [];

  const totalScore = metrics.length
    ? Math.round(metrics.reduce((sum, m) => sum + (m.score / m.max) * 100, 0) / metrics.length)
    : 0;

  const tips = assessment?.tips ?? [];

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className="flex min-h-[100dvh] md:min-h-0 h-full flex-col px-6 pt-8 pb-8 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface ease-presence transition-transform active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">Your Results</h2>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing your session...</p>
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground text-center px-4">{error}</p>
          <button
            onClick={onNewSession}
            className="h-12 rounded-2xl bg-primary px-6 text-primary-foreground font-medium"
          >
            Start New Session
          </button>
        </div>
      ) : (
        <>
          {/* Score circle */}
          <div className="mt-8 flex justify-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.2, 0, 0, 1] }}
              className="relative flex h-32 w-32 items-center justify-center"
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--surface))" strokeWidth="6" />
                <motion.circle
                  cx="64" cy="64" r="56" fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 56}
                  initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - totalScore / 100) }}
                  transition={{ delay: 0.4, duration: 0.8, ease: [0.2, 0, 0, 1] }}
                />
              </svg>
              <div className="text-center">
                <span className="tabular-nums text-4xl font-semibold text-foreground">{totalScore}</span>
                <p className="text-[10px] text-muted-foreground">OVERALL</p>
              </div>
            </motion.div>
          </div>

          {/* Metrics */}
          <div className="mt-8 flex flex-col gap-3">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="w-24 text-sm text-foreground">{m.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${(m.score / m.max) * 100}%` }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 0.5, ease: [0.2, 0, 0, 1] }}
                    />
                  </div>
                  <span className="tabular-nums text-sm font-medium text-foreground w-10 text-right">
                    {m.score}/{m.max}
                  </span>
                </div>
                <p className="ml-7 mt-1 text-[11px] leading-relaxed text-muted-foreground">{m.feedback}</p>
              </motion.div>
            ))}
          </div>

          {/* Tips */}
          <div className="mt-6 rounded-3xl bg-surface p-5 card-depth">
            <h3 className="text-sm font-semibold text-foreground mb-3">Tips for Improvement</h3>
            <ul className="flex flex-col gap-2">
              {tips.map((tip, i) => (
                <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                  • {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1" />

          {/* Zero credits CTA */}
          {!loading && credits <= 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="mt-4 rounded-2xl bg-primary/10 p-4 flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 flex-shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">You've run out of credits!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Buy 1 credit for $2 to continue practicing.</p>
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex-shrink-0 ease-presence transition-transform active:scale-95"
              >
                Buy Now
              </button>
            </motion.div>
          )}

          {/* Actions - updated buttons */}
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={onNewSession}
              className="h-14 w-full rounded-2xl bg-foreground text-background font-medium ease-presence transition-transform active:scale-95 will-change-transform"
            >
              Start New Session
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="h-12 w-full rounded-2xl bg-surface text-foreground text-sm font-medium ease-presence transition-transform active:scale-95"
            >
              Go to Dashboard
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default SummaryScreen;
