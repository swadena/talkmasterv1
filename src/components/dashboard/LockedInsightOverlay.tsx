import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LockedInsightOverlayProps {
  previewText?: string;
  children?: React.ReactNode;
}

const LockedInsightOverlay = ({ previewText, children }: LockedInsightOverlayProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative rounded-2xl bg-surface p-5 card-depth overflow-hidden min-h-[120px]">
      {/* Blurred preview content */}
      <div className="select-none pointer-events-none blur-[6px] opacity-50 py-2">
        {children || (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {previewText || "Your personalized insight will appear here with actionable tips..."}
          </p>
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/60 backdrop-blur-[2px] rounded-2xl px-6 py-5">
        <Lock className="h-5 w-5 text-muted-foreground mb-2" />
        <p className="text-xs text-center text-muted-foreground mb-3 max-w-[220px] leading-relaxed">
          See your strengths, weaknesses, and progress over time
        </p>
        <button
          onClick={() => navigate("/dashboard?tab=credits")}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform active:scale-95 hover:opacity-90"
        >
          Unlock full insights
        </button>
      </div>
    </div>
  );
};

export default LockedInsightOverlay;
