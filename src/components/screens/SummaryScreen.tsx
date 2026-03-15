import { motion } from "framer-motion";
import { ChevronLeft, CheckCircle2 } from "lucide-react";

const metrics = [
  { label: "Clarity", score: 7, max: 10 },
  { label: "Logic", score: 6, max: 10 },
  { label: "Evidence", score: 8, max: 10 },
  { label: "Confidence", score: 7, max: 10 },
  { label: "Pacing", score: 6, max: 10 },
  { label: "Filler Words", score: 5, max: 10 },
];

const tips = [
  "Use specific evidence to support your key points.",
  "Reduce filler words ('um', 'like') during the opening.",
  "Practice speaking at a steadier, more deliberate pace.",
];

interface SummaryScreenProps {
  onNewSession: () => void;
  onBack: () => void;
}

const SummaryScreen = ({ onNewSession, onBack }: SummaryScreenProps) => {
  const totalScore = Math.round(
    metrics.reduce((sum, m) => sum + (m.score / m.max) * 100, 0) / metrics.length
  );

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className="flex h-full flex-col px-6 pt-14 pb-8"
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
            className="flex items-center gap-3"
          >
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

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-4">
        <button
          onClick={onNewSession}
          className="h-14 w-full rounded-2xl bg-foreground text-background font-medium ease-presence transition-transform active:scale-95 will-change-transform"
        >
          Start New Session
        </button>
        <button
          onClick={onNewSession}
          className="h-12 w-full rounded-2xl bg-surface text-foreground text-sm font-medium ease-presence transition-transform active:scale-95"
        >
          Review Transcript
        </button>
      </div>
    </motion.div>
  );
};

export default SummaryScreen;
