import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface InsightSummaryProps {
  insight: string | null;
  loading: boolean;
}

const InsightSummary = ({ insight, loading }: InsightSummaryProps) => {
  if (loading) {
    return (
      <div className="rounded-3xl bg-surface p-5 card-depth animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-4/5 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-surface p-5 card-depth"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Speaking Insight</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{insight}</p>
    </motion.div>
  );
};

export default InsightSummary;
