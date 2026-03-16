import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setConfirmMessage("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setConfirmMessage("Check your email to confirm your account, then log in.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-[120px] h-[30px] bg-background rounded-b-2xl" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex h-full flex-col px-6 pt-14 pb-8"
        >
          {/* Logo */}
          <div className="mt-4 flex items-center justify-center gap-2">
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
          </div>

          <div className="mt-12">
            <h1 className="text-3xl font-semibold leading-tight text-foreground">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin ? "Sign in to continue practicing" : "Start with 3 free credits"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 h-12 w-full rounded-2xl bg-surface px-4 text-sm text-foreground outline-none ring-1 ring-border focus:ring-primary transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
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

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            {confirmMessage && (
              <p className="text-xs text-success">{confirmMessage}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-foreground text-background font-medium ease-presence transition-transform active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="flex-1" />

          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); setConfirmMessage(""); }}
            className="text-center text-sm text-muted-foreground"
          >
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span className="text-primary font-medium">{isLogin ? "Sign Up" : "Sign In"}</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
