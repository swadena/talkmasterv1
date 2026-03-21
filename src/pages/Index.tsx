import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ResponsiveShell from "@/components/ResponsiveShell";
import HomeScreen from "@/components/screens/HomeScreen";
import DailyChallengeIntroScreen from "@/components/screens/DailyChallengeIntroScreen";
import RecordingScreen from "@/components/screens/RecordingScreen";
import FeedbackScreen from "@/components/screens/FeedbackScreen";
import SummaryScreen from "@/components/screens/SummaryScreen";
import FeedbackRewardPopup from "@/components/FeedbackRewardPopup";
import PaywallPopup from "@/components/PaywallPopup";
import SessionExitDialog from "@/components/SessionExitDialog";
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
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null);
  const startingRef = useRef(false);
  const creditDeductedRef = useRef(false);

  const isSessionScreen = screen === "recording" || screen === "feedback" || screen === "daily_intro";

  const handleStart = async (selectedMode: PracticeMode) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (credits <= 0) {
      setShowPaywall(true);
      return;
    }
    if (startingRef.current) return;
    startingRef.current = true;

    const success = await deductCredit();
    if (!success) {
      startingRef.current = false;
      toast({ title: "Could not start session", description: "Please try again.", variant: "destructive" });
      return;
    }
    creditDeductedRef.current = true;

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
    startingRef.current = false;
  };

  const attemptSessionExit = (exitAction: () => void) => {
    setPendingExitAction(() => exitAction);
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    creditDeductedRef.current = false;
    if (pendingExitAction) pendingExitAction();
    setPendingExitAction(null);
  };

  const cancelExit = () => {
    setShowExitDialog(false);
    setPendingExitAction(null);
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

  const checkFeedbackEligibility = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("feedback_reward_claimed, feedback_skipped_once")
        .eq("id", user.id)
        .single();

      if (!profile) return;
      const claimed = (profile as any).feedback_reward_claimed;
      const skippedOnce = (profile as any).feedback_skipped_once;
      if (claimed) return;

      const { count } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const sessionCount = count || 0;
      if (sessionCount === 2 && !skippedOnce) {
        setShowFeedbackPopup(true);
      } else if (sessionCount === 3 && skippedOnce) {
        setShowFeedbackPopup(true);
      }
    } catch (e) {
      console.error("Feedback eligibility check failed:", e);
    }
  };

  const handleSessionComplete = async (assessment: { scores: Record<string, number>; feedback: Record<string, string>; tips: string[] } | null) => {
    if (!user) return;

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

    creditDeductedRef.current = false;
    await refreshCredits();
    await checkFeedbackEligibility();

    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (updatedProfile && updatedProfile.credits <= 0) {
      const { count } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count || 0) >= 3) {
        setShowPaywall(true);
      }
    }
  };

  return (
    <ResponsiveShell fullscreen={isSessionScreen}>
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
            onBack={() => attemptSessionExit(() => setScreen("home"))}
          />
        )}
        {screen === "recording" && (
          <RecordingScreen
            key="recording"
            mode={mode}
            sessionStart={sessionStart}
            skipCountdown={mode === "daily_challenge"}
            onStop={handleRecordingStop}
            onBack={() => attemptSessionExit(() => setScreen("home"))}
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
            onBack={() => attemptSessionExit(() => setScreen("home"))}
          />
        )}
        {screen === "summary" && (
          <SummaryScreen
            key="summary"
            mode={mode}
            conversationLog={conversationLog}
            onNewSession={() => setScreen("home")}
            onBack={() => setScreen("home")}
            onSessionComplete={handleSessionComplete}
          />
        )}
      </AnimatePresence>

      <FeedbackRewardPopup
        open={showFeedbackPopup}
        onClose={() => setShowFeedbackPopup(false)}
      />
      <PaywallPopup
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
      <SessionExitDialog
        open={showExitDialog}
        onContinue={cancelExit}
        onExit={confirmExit}
      />
    </ResponsiveShell>
  );
};

export default Index;
