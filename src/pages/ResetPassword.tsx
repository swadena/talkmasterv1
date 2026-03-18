import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Invalid or expired reset link.</p>
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex h-full flex-col px-6 pt-14 pb-8"
        >
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="h-2 w-2 rounded-full bg-primary/60" />
                <div className="h-2 w-2 rounded-full bg-primary/30" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Think2Talk
              </span>
            </div>
          </div>

          <div className="mt-12">
            <h1 className="text-3xl font-semibold leading-tight text-foreground">Set new password</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter your new password below</p>
          </div>

          {success ? (
            <div className="mt-8">
              <p className="text-sm text-success">Password updated! Redirecting…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 h-12 w-full rounded-2xl bg-surface px-4 text-sm text-foreground outline-none ring-1 ring-border focus:ring-primary transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-foreground text-background font-medium ease-presence transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update Password"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
