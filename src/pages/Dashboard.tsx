import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, LogOut, TrendingUp, BarChart3, Clock, CreditCard, Loader2, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CreditPackages from "@/components/CreditPackages";
import ReferralSection from "@/components/ReferralSection";
import InsightSummary from "@/components/dashboard/InsightSummary";
import TrendIndicator from "@/components/dashboard/TrendIndicator";

interface SessionRecord {
  id: string;
  mode: string;
  overall_score: number | null;
  scores: Record<string, number> | null;
  feedback: Record<string, string> | null;
  tips: string[] | null;
  created_at: string;
}

const SKILL_KEYS = ["clarity", "logic", "evidence", "confidence", "pacing", "filler_words"];
const SKILL_LABELS: Record<string, string> = {
  clarity: "Clarity",
  logic: "Logic",
  evidence: "Evidence",
  confidence: "Confidence",
  pacing: "Pacing",
  filler_words: "Filler Words",
};

const SKILL_HINTS: Record<string, string> = {
  clarity: "How clearly you express your main points",
  logic: "How well your arguments follow a logical structure",
  evidence: "How effectively you support claims with examples",
  confidence: "How assured and decisive your delivery sounds",
  pacing: "How well you manage your speaking speed and pauses",
  filler_words: "How well you avoid um, uh, like, and other fillers",
};

type Tab = "progress" | "history" | "credits" | "referrals" | "account";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, credits, signOut, refreshCredits, daysUntilExpiry } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("progress");
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [trends, setTrends] = useState<Record<string, string> | null>(null);
  const [metricTips, setMetricTips] = useState<Record<string, string> | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const fetchSessions = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setSessions((data as SessionRecord[]) || []);
      setLoading(false);
    };
    fetchSessions();
  }, [user, navigate]);

  // Fetch AI insights when sessions load
  useEffect(() => {
    if (sessions.length < 2 || !user) return;
    const fetchInsight = async () => {
      setInsightLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-insight");
        if (!error && data) {
          setInsight(data.insight);
          setTrends(data.trends);
        }
      } catch (e) {
        console.error("Insight fetch failed:", e);
      } finally {
        setInsightLoading(false);
      }
    };
    fetchInsight();
  }, [sessions.length, user]);

  const totalSessions = sessions.length;
  const avgScore = totalSessions
    ? Math.round(sessions.reduce((s, x) => s + (x.overall_score || 0), 0) / totalSessions)
    : 0;
  const latestScore = sessions[0]?.overall_score || 0;

  const skillAverages = SKILL_KEYS.map((key) => {
    const scored = sessions.filter((s) => s.scores && (s.scores as any)[key] != null);
    const avg = scored.length
      ? Math.round((scored.reduce((sum, s) => sum + ((s.scores as any)[key] || 0), 0) / scored.length) * 10) / 10
      : 0;
    return { key, label: SKILL_LABELS[key], avg };
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "history", label: "History", icon: Clock },
    { id: "credits", label: "Credits", icon: CreditCard },
    { id: "referrals", label: "Referrals", icon: Gift },
    { id: "account", label: "Account", icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Session detail view
  if (selectedSession) {
    const scores = selectedSession.scores as Record<string, number> | null;
    const feedback = selectedSession.feedback as Record<string, string> | null;
    const tips = (selectedSession.tips as string[]) || [];
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative mx-auto h-[812px] w-[375px] overflow-hidden rounded-4xl border border-border bg-background shadow-2xl">
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 pt-3 pb-1">
            <span className="text-xs font-medium text-foreground">9:41</span>
            <div className="h-2.5 w-4 rounded-sm border border-foreground/40 relative">
              <div className="absolute inset-[2px] right-[3px] rounded-[1px] bg-foreground/60" />
            </div>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-[120px] h-[30px] bg-background rounded-b-2xl" />

          <div className="flex h-full flex-col px-6 pt-14 pb-8 overflow-y-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedSession(null)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface ease-presence transition-transform active:scale-95">
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
              <h2 className="text-lg font-semibold text-foreground">Session Details</h2>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              {new Date(selectedSession.created_at).toLocaleDateString()} · {selectedSession.mode.charAt(0).toUpperCase() + selectedSession.mode.slice(1)}
            </div>

            <div className="mt-6 flex justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--surface))" strokeWidth="6" />
                  <circle cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={2 * Math.PI * 56 * (1 - (selectedSession.overall_score || 0) / 100)}
                  />
                </svg>
                <div className="text-center">
                  <span className="tabular-nums text-3xl font-semibold text-foreground">{selectedSession.overall_score || 0}</span>
                  <p className="text-[10px] text-muted-foreground">OVERALL</p>
                </div>
              </div>
            </div>

            {scores && feedback && (
              <div className="mt-6 flex flex-col gap-3">
                {SKILL_KEYS.map((key) => (
                  <div key={key}>
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-sm text-foreground">{SKILL_LABELS[key]}</span>
                      <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${((scores[key] || 0) / 10) * 100}%` }} />
                      </div>
                      <span className="tabular-nums text-sm font-medium text-foreground w-10 text-right">{scores[key] || 0}/10</span>
                    </div>
                    {feedback[key] && <p className="ml-0 mt-1 text-[11px] leading-relaxed text-muted-foreground">{feedback[key]}</p>}
                  </div>
                ))}
              </div>
            )}

            {tips.length > 0 && (
              <div className="mt-6 rounded-3xl bg-surface p-5 card-depth">
                <h3 className="text-sm font-semibold text-foreground mb-3">Tips for Improvement</h3>
                <ul className="flex flex-col gap-2">
                  {tips.map((tip, i) => (
                    <li key={i} className="text-xs leading-relaxed text-muted-foreground">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="relative mx-auto h-[812px] w-[375px] overflow-hidden rounded-4xl border border-border bg-background shadow-2xl">
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 pt-3 pb-1">
          <span className="text-xs font-medium text-foreground">9:41</span>
          <div className="h-2.5 w-4 rounded-sm border border-foreground/40 relative">
            <div className="absolute inset-[2px] right-[3px] rounded-[1px] bg-foreground/60" />
          </div>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-[120px] h-[30px] bg-background rounded-b-2xl" />

        <div className="flex h-full flex-col pt-14 pb-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-6">
            <button onClick={() => navigate("/")} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface ease-presence transition-transform active:scale-95">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
                }`}
              >
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-8">
            {activeTab === "progress" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex flex-col gap-5">
                {/* AI Insight Summary */}
                <InsightSummary insight={insight} loading={insightLoading} />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-surface p-3 text-center card-depth">
                    <p className="tabular-nums text-2xl font-semibold text-foreground">{totalSessions}</p>
                    <p className="text-[10px] text-muted-foreground">Sessions</p>
                  </div>
                  <div className="rounded-2xl bg-surface p-3 text-center card-depth">
                    <p className="tabular-nums text-2xl font-semibold text-foreground">{avgScore}</p>
                    <p className="text-[10px] text-muted-foreground">Avg Score</p>
                  </div>
                  <div className="rounded-2xl bg-surface p-3 text-center card-depth">
                    <p className="tabular-nums text-2xl font-semibold text-foreground">{latestScore}</p>
                    <p className="text-[10px] text-muted-foreground">Latest</p>
                  </div>
                </div>

                {/* Skill Breakdown with trends */}
                <div className="rounded-3xl bg-surface p-5 card-depth">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Skill Breakdown</h3>
                  <div className="flex flex-col gap-3">
                    {skillAverages.map((s) => (
                      <div key={s.key}>
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-xs text-foreground">{s.label}</span>
                          {trends && trends[s.key] && <TrendIndicator trend={trends[s.key]} />}
                          <div className="flex-1 h-2 rounded-full bg-background overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(s.avg / 10) * 100}%` }} />
                          </div>
                          <span className="tabular-nums text-xs font-medium text-foreground w-8 text-right">{s.avg}</span>
                        </div>
                        <p className="ml-0 mt-1 text-[10px] leading-relaxed text-muted-foreground/70">{SKILL_HINTS[s.key]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex flex-col gap-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center mt-12">No sessions yet. Start practicing!</p>
                ) : (
                  sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      className="flex items-center justify-between rounded-2xl bg-surface p-4 card-depth text-left ease-presence transition-transform active:scale-[0.98]"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.mode.charAt(0).toUpperCase() + s.mode.slice(1)}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums text-lg font-semibold text-foreground">{s.overall_score || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Score</p>
                      </div>
                    </button>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === "credits" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
                <div className="rounded-3xl bg-surface p-5 card-depth text-center mb-6">
                  <p className="tabular-nums text-4xl font-semibold text-foreground">{credits}</p>
                  <p className="text-xs text-muted-foreground mt-1">Credits remaining</p>
                  {credits > 0 && daysUntilExpiry !== null && (
                    <p className={`text-xs mt-2 ${daysUntilExpiry <= 5 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {daysUntilExpiry <= 5 ? "⚠️ " : "⏳ "}
                      {daysUntilExpiry <= 5
                        ? `${credits} credits expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`
                        : `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`}
                    </p>
                  )}
                </div>
                <CreditPackages onPurchase={refreshCredits} />
              </motion.div>
            )}

            {activeTab === "referrals" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
                <ReferralSection />
              </motion.div>
            )}

            {activeTab === "account" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex flex-col gap-4">
                <div className="rounded-3xl bg-surface p-5 card-depth">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Account Info</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Email</span>
                      <span className="text-xs text-foreground">{user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Credits</span>
                      <span className="text-xs text-foreground">{credits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Sessions</span>
                      <span className="text-xs text-foreground">{totalSessions}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/reset-password-change")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-foreground font-medium ease-presence transition-transform active:scale-95 ring-1 ring-border"
                >
                  Change Password
                </button>

                <button
                  onClick={handleLogout}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-destructive text-destructive-foreground font-medium ease-presence transition-transform active:scale-95"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
