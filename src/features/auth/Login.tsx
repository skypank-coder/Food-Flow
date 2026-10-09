import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { Field, FormError, PasswordNote } from "./fields";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { firebaseConfigError } from "@/lib/firebase";

export default function Login() {
  const { signIn, sendPasswordReset, demoSignIn, error: authError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("ops@freshroots.in");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setResetBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendPasswordReset(email);
      setNotice("If an account exists for that email, Firebase has sent a password reset link.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not send a reset email.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your FoodFlow workspace."
      footer={
        <>
          New to FoodFlow?{" "}
          <Link to="/signup" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {/* Pitch mode: get straight into the workspace. Live Firebase login
          is kept below for when it's switched back on. */}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => {
          demoSignIn();
          navigate("/dashboard");
        }}
      >
        Enter demo workspace <ArrowRight size={16} />
      </Button>
      {/* Email login only shows when Firebase is configured — keeps the
          pitch screen clean (demo only) while live login is on hold. */}
      {!firebaseConfigError && (
      <>
      <div className="my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-ink-3">
        <span className="h-px flex-1 bg-line" /> or sign in with email <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Work email"
          icon={<Mail size={16} />}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@company.in"
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          icon={<Lock size={16} />}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          autoComplete="current-password"
          required
          rightLabel={
            <button type="button" onClick={resetPassword} disabled={resetBusy} className="text-xs text-ink-3 hover:text-ink disabled:opacity-50">
              {resetBusy ? "Sending…" : "Forgot?"}
            </button>
          }
        />
        <FormError>{error ?? authError}</FormError>
        {notice && <p role="status" className="text-sm text-ok">{notice}</p>}
        <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in with email"} <ArrowRight size={16} />
        </Button>
        <PasswordNote />
      </form>
      </>
      )}
    </AuthShell>
  );
}
