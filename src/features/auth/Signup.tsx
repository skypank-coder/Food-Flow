import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Lock, Mail, User as UserIcon } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { Field, FormError, Select, PasswordNote } from "./fields";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { firebaseConfigError } from "@/lib/firebase";

const ROLES = ["Operations", "FPO / Cooperative", "Processor", "Mandi / Market", "Food bank / NGO", "Logistics"];

export default function Signup() {
  const { signUp, demoSignIn, error: authError } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signUp({ name, email, password, org, role });
      navigate("/dashboard");
    } catch (signUpError) {
      setError(signUpError instanceof Error ? signUpError.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Start with FoodFlow"
      subtitle="Create a workspace and open the command center in seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {/* Pitch mode: jump straight in. Live account creation stays below. */}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => {
          demoSignIn({ name: name || undefined, email: email || undefined, org: org || undefined, role });
          navigate("/dashboard");
        }}
      >
        Enter demo workspace <ArrowRight size={16} />
      </Button>
      {!firebaseConfigError && (
      <>
      <div className="my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-ink-3">
        <span className="h-px flex-1 bg-line" /> or create an account <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" icon={<UserIcon size={16} />} value={name} onChange={setName} placeholder="Ravi Kumar" required autoComplete="name" />
        <Field label="Work email" icon={<Mail size={16} />} type="email" value={email} onChange={setEmail} placeholder="you@company.in" required autoComplete="email" />
        <Field label="Organization" icon={<Building2 size={16} />} value={org} onChange={setOrg} placeholder="FreshRoots FPO" />
        <Select label="Your role" value={role} onChange={setRole} options={ROLES} />
        <Field label="Password" icon={<Lock size={16} />} type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" required minLength={6} autoComplete="new-password" />
        <Field label="Confirm password" icon={<Lock size={16} />} type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter your password" required minLength={6} autoComplete="new-password" />
        <FormError>{error ?? authError}</FormError>
        <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account with email"} <ArrowRight size={16} />
        </Button>
        <PasswordNote />
      </form>
      </>
      )}
    </AuthShell>
  );
}
