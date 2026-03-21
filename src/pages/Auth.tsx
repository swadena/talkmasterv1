import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Eye, EyeOff } from "lucide-react";
const PasswordInput = ({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  label: string;
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <div className="relative mt-1">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={6}
        className="h-12 w-full rounded-2xl bg-surface px-4 pr-12 text-sm text-foreground outline-none ring-1 ring-border focus:ring-primary transition-colors"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  </div>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const referralCode = searchParams.get("ref") || "";

  if (user) {
    navigate("/");
    return null;
  }

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 6) return "Password must be at least 6 characters";
    if (!/[A-Za-z]/.test(pw)) return "Password must contain at least one letter";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setConfirmMessage("");

    if (!forgotMode && !isLogin) {
      const pwError = validatePassword(password);
      if (pwError) { setError(pwError); return; }
      if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    }

    setLoading(true);
    try {
      if (forgotMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setConfirmMessage("Check your email for a password reset link.");
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: referralCode ? { referral_code: referralCode } : undefined,
          },
        });
        if (error) throw error;
        if (referralCode && data.user) {
          localStorage.setItem("pending_referral", referralCode);
        }
        setConfirmMessage("Check your email to confirm your account, then log in.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setConfirmMessage("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
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
                Think2Talk
              </span>
            </div>
          </div>

          <div className="mt-10">
            <h1 className="text-3xl font-semibold leading-tight text-foreground">
              {forgotMode ? "Reset password" : isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {forgotMode
                ? "Enter your email to receive a reset link"
                : isLogin
                ? "Sign in to continue practicing"
                : "Practice speaking, sharpen your thinking"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
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

            {!forgotMode && (
              <>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  placeholder="••••••••"
                  label="Password"
                />

                {!isLogin && (
                  <PasswordInput
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                    placeholder="••••••••"
                    label="Confirm Password"
                  />
                )}

                {!isLogin && password.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-1">
                    {[
                      { ok: password.length >= 6, text: "6+ chars" },
                      { ok: /[A-Za-z]/.test(password), text: "1 letter" },
                      { ok: /[0-9]/.test(password), text: "1 number" },
                    ].map((r) => (
                      <span
                        key={r.text}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                          r.ok
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r.ok ? "✓" : "○"} {r.text}
                      </span>
                    ))}
                  </div>
                )}

                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError(""); setConfirmMessage(""); }}
                    className="text-xs text-primary font-medium text-left px-1 -mt-1"
                  >
                    Forgot password?
                  </button>
                )}
              </>
            )}

            {error && (
              <p className="text-xs text-destructive px-1">{error}</p>
            )}
            {confirmMessage && (
              <p className="text-xs text-success px-1">{confirmMessage}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-14 w-full items-center justify-center rounded-2xl bg-foreground text-background font-medium transition-transform active:scale-[0.97] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : forgotMode ? (
                "Send Reset Link"
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          <div className="flex-1" />

          {forgotMode ? (
            <button
              onClick={() => { setForgotMode(false); setError(""); setConfirmMessage(""); }}
              className="text-center text-sm text-muted-foreground"
            >
              Back to <span className="text-primary font-medium">Sign In</span>
            </button>
          ) : (
            <button
              onClick={switchMode}
              className="text-center text-sm text-muted-foreground"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-primary font-medium">{isLogin ? "Sign Up" : "Sign In"}</span>
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
