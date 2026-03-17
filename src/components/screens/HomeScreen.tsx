import { motion } from "framer-motion";
import { MessageSquare, Mic, Lightbulb, Presentation, User, Zap, Clock, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { PracticeMode } from "@/pages/Index";

const modes = [
  { id: "debate" as PracticeMode, label: "Debate", icon: MessageSquare, desc: "Argue your position" },
  { id: "interview" as PracticeMode, label: "Interview", icon: Mic, desc: "Practice Q&A" },
  { id: "pitch" as PracticeMode, label: "Pitch", icon: Lightbulb, desc: "Sell your idea" },
  { id: "presentation" as PracticeMode, label: "Presentation", icon: Presentation, desc: "Deliver with impact" },
];

interface HomeScreenProps {
  onStart: (mode: PracticeMode) => void;
}

const HomeScreen = ({ onStart }: HomeScreenProps) => {
  const navigate = useNavigate();
  const { user, credits } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="flex h-full flex-col px-6 pt-14 pb-8"
    >
      {/* Top bar with logo, credits, and profile */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <div className="h-2 w-2 rounded-full bg-primary/60" />
            <div className="h-2 w-2 rounded-full bg-primary/30" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            TalkMaster
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 ease-presence transition-transform active:scale-95"
            >
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium text-primary tabular-nums">{credits}</span>
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface ease-presence transition-transform active:scale-95"
            >
              <User className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Greeting */}
      <div className="mt-12">
        <h1 className="text-3xl font-semibold leading-tight text-foreground text-pretty">
          What are we<br />practicing today?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user ? "Choose a mode to start your session" : "Sign in to start practicing"}
        </p>
      </div>

      {/* Mode cards */}
      <div className="mt-8 flex flex-col gap-3">
        {modes.map((mode, i) => (
          <motion.button
            key={mode.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.3, ease: [0.2, 0, 0, 1] }}
            onClick={() => onStart(mode.id)}
            className="card-depth flex items-center gap-4 rounded-3xl bg-surface p-4 text-left ease-presence transition-transform duration-250 active:scale-[0.97] will-change-transform"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <mode.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-base font-medium text-foreground">{mode.label}</span>
              <p className="text-xs text-muted-foreground">{mode.desc}</p>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground/60">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] font-medium">15 min</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Bottom */}
      <div className="flex-1" />

      {!user ? (
        <button
          onClick={() => navigate("/auth")}
          className="h-12 w-full rounded-2xl bg-primary text-primary-foreground font-medium ease-presence transition-transform active:scale-95"
        >
          Sign In to Start
        </button>
      ) : (
        <p className="text-center text-[10px] text-muted-foreground/50">
          Your sessions are private and never shared
        </p>
      )}
    </motion.div>
  );
};

export default HomeScreen;
