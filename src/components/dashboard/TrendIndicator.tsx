import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  trend: string;
}

const TrendIndicator = ({ trend }: TrendIndicatorProps) => {
  if (trend === "improving") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-success">
        <TrendingUp className="h-3 w-3" />
        ↑
      </span>
    );
  }
  if (trend === "needs_work") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive">
        <TrendingDown className="h-3 w-3" />
        ↓
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
    </span>
  );
};

export default TrendIndicator;
