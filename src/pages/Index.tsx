import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import HomeScreen from "@/components/screens/HomeScreen";
import RecordingScreen from "@/components/screens/RecordingScreen";
import FeedbackScreen from "@/components/screens/FeedbackScreen";
import SummaryScreen from "@/components/screens/SummaryScreen";

export type AppScreen = "home" | "recording" | "feedback" | "summary";
export type PracticeMode = "debate" | "interview" | "pitch" | "presentation";

const Index = () => {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [mode, setMode] = useState<PracticeMode>("interview");

  const handleStart = (selectedMode: PracticeMode) => {
    setMode(selectedMode);
    setScreen("recording");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {/* Mobile frame */}
      <div className="relative mx-auto h-[812px] w-[375px] overflow-hidden rounded-4xl border border-border bg-background shadow-2xl">
        {/* Status bar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 pt-3 pb-1">
          <span className="text-xs font-medium text-foreground">9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-4 rounded-sm border border-foreground/40 relative">
              <div className="absolute inset-[2px] right-[3px] rounded-[1px] bg-foreground/60" />
            </div>
          </div>
        </div>

        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-[120px] h-[30px] bg-background rounded-b-2xl" />

        <AnimatePresence mode="wait">
          {screen === "home" && (
            <HomeScreen key="home" onStart={handleStart} />
          )}
          {screen === "recording" && (
            <RecordingScreen
              key="recording"
              mode={mode}
              onStop={() => setScreen("feedback")}
              onBack={() => setScreen("home")}
            />
          )}
          {screen === "feedback" && (
            <FeedbackScreen
              key="feedback"
              mode={mode}
              onFinish={() => setScreen("summary")}
              onBack={() => setScreen("recording")}
            />
          )}
          {screen === "summary" && (
            <SummaryScreen
              key="summary"
              onNewSession={() => setScreen("home")}
              onBack={() => setScreen("feedback")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
