import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import HomeScreen from "@/components/screens/HomeScreen";
import DailyChallengeIntroScreen from "@/components/screens/DailyChallengeIntroScreen";
import RecordingScreen from "@/components/screens/RecordingScreen";
import FeedbackScreen from "@/components/screens/FeedbackScreen";
import SummaryScreen from "@/components/screens/SummaryScreen";
import { toast } from "@/hooks/use-toast";

export type AppScreen = "home" | "daily_intro" | "recording" | "feedback" | "summary";
export type PracticeMode = "debate" | "interview" | "pitch" | "presentation" | "daily_challenge";

export interface ConversationEntry {
  role: "user" | "challenge";
  text: string;
  round: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, credits, deductCredit, refreshCredits } = useAuth();
  const [screen, setScreen] = useState<AppScreen>("home");
  const [mode, setMode] = useState<PracticeMode>("interview");
  const [transcript, setTranscript] = useState("");
  const [conversationLog, setConversationLog] = useState<ConversationEntry[]>([]);
  const [sessionStart, setSessionStart] = useState<number>(0);
  const [dailyTopic, setDailyTopic] = useState<string>("");

  const handleStart = (selectedMode: PracticeMode) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (credits <= 0) {
      toast({
        title: "No credits remaining",
        description: "Purchase more credits to start a session.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setMode(selectedMode);
    setTranscript("");
    setConversationLog([]);
    setDailyTopic("");

    if (selectedMode === "daily_challenge") {
      setScreen("daily_intro");
    } else {
      setSessionStart(Date.now());
      setScreen("recording");
    }
  };

  const handleRecordingStop = (recordedTranscript: string) => {
    setTranscript(recordedTranscript);
    setConversationLog([{ role: "user", text: recordedTranscript, round: 0 }]);
    setScreen("feedback");
  };

  const handleFeedbackFinish = (log: ConversationEntry[]) => {
    setConversationLog(log);
    setScreen("summary");
  };

  const handleSessionComplete = async (assessment: { scores: Record<string, number>; feedback: Record<string, string>; tips: string[] } | null) => {
    if (!user) return;

    // Deduct credit
    await deductCredit();

    // Save session to database
    if (assessment) {
      const overallScore = Math.round(
        Object.values(assessment.scores).reduce((s, v) => s + (v / 10) * 100, 0) / Object.keys(assessment.scores).length
      );

      await supabase.from("sessions").insert([{
        user_id: user.id,
        mode,
        scores: assessment.scores as any,
        feedback: assessment.feedback as any,
        tips: assessment.tips as any,
        conversation_log: conversationLog as any,
        overall_score: overallScore,
      }]);
    }

    await refreshCredits();
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
          {screen === "daily_intro" && (
            <DailyChallengeIntroScreen
              key="daily_intro"
              onReady={(topic) => {
                setDailyTopic(topic);
                setSessionStart(Date.now());
                setScreen("recording");
              }}
              onBack={() => setScreen("home")}
            />
          )}
          {screen === "recording" && (
            <RecordingScreen
              key="recording"
              mode={mode}
              sessionStart={sessionStart}
              skipCountdown={mode === "daily_challenge"}
              onStop={handleRecordingStop}
              onBack={() => setScreen("home")}
            />
          )}
          {screen === "feedback" && (
          <FeedbackScreen
              key="feedback"
              mode={mode}
              sessionStart={sessionStart}
              initialTranscript={transcript}
              initialConversationLog={conversationLog}
              dailyTopic={dailyTopic}
              onFinish={handleFeedbackFinish}
              onBack={() => setScreen("recording")}
            />
          )}
          {screen === "summary" && (
            <SummaryScreen
              key="summary"
              mode={mode}
              conversationLog={conversationLog}
              onNewSession={() => setScreen("home")}
              onBack={() => setScreen("feedback")}
              onSessionComplete={handleSessionComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
