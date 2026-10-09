import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseErrorMessage, firebaseConfigError, requireFirebase } from "./firebase";

export interface User {
  uid: string;
  name: string;
  email: string;
  org: string;
  role: string;
  initials: string;
}

interface SignUpData {
  name: string;
  email: string;
  password: string;
  org: string;
  role: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  /** Direct demo sign-in (no Firebase) — used for pitching while live auth is on hold. */
  demoSignIn: (opts?: { email?: string; name?: string; org?: string; role?: string }) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Demo session (pitch mode): a local workspace that bypasses Firebase so
// anyone can get straight into the app. Kept entirely separate from the
// Firebase path, which stays wired for when live login is turned back on.
const DEMO_KEY = "foodflow.demo.v1";

function readDemo(): User | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "FF";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] || "there";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function userFromProfile(uid: string, email: string, profile: Partial<User>): User {
  const name = typeof profile.name === "string" && profile.name ? profile.name : nameFromEmail(email);
  return {
    uid,
    name,
    email,
    org: typeof profile.org === "string" && profile.org ? profile.org : "FoodFlow Workspace",
    role: typeof profile.role === "string" && profile.role ? profile.role : "Operations",
    initials: typeof profile.initials === "string" && profile.initials ? profile.initials : initials(name),
  };
}

function profileForUser(user: User) {
  return {
    name: user.name,
    email: user.email,
    org: user.org,
    role: user.role,
    initials: user.initials,
    updatedAt: serverTimestamp(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demoInitial = readDemo();
  const [user, setUser] = useState<User | null>(demoInitial);
  const [loading, setLoading] = useState(!demoInitial);
  const [error, setError] = useState<string | null>(demoInitial ? null : firebaseConfigError);

  useEffect(() => {
    // A demo session takes precedence and skips Firebase entirely so the
    // onAuthStateChanged listener can't clear it.
    if (readDemo()) {
      setLoading(false);
      return;
    }
    if (!firebaseConfigError) {
      const { auth, db } = requireFirebase();
      return onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          setError(null);
          setLoading(false);
          return;
        }

        void loadProfile(firebaseUser, db)
          .then((profile) => {
            setUser(profile);
            setError(null);
          })
          .catch((profileError: unknown) => {
            setUser(userFromProfile(firebaseUser.uid, firebaseUser.email ?? "", {}));
            setError(firebaseErrorMessage(profileError));
          })
          .finally(() => setLoading(false));
      });
    }

    setLoading(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      error,
      async signIn(email, password) {
        setError(null);
        try {
          const { auth } = requireFirebase();
          await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (signInError) {
          const message = firebaseErrorMessage(signInError);
          setError(message);
          throw new Error(message);
        }
      },
      async signUp({ name, email, password, org, role }) {
        setError(null);
        try {
          const { auth, db } = requireFirebase();
          const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          const cleanName = name.trim();
          await updateProfile(credential.user, { displayName: cleanName });
          const profile = userFromProfile(credential.user.uid, email.trim(), {
            name: cleanName,
            org: org.trim() || "FoodFlow Workspace",
            role,
          });
          await setDoc(doc(db, "users", credential.user.uid), profileForUser(profile));
          setUser(profile);
        } catch (signUpError) {
          const message = firebaseErrorMessage(signUpError);
          setError(message);
          throw new Error(message);
        }
      },
      async sendPasswordReset(email) {
        setError(null);
        try {
          const { auth } = requireFirebase();
          await sendPasswordResetEmail(auth, email.trim());
        } catch (resetError) {
          const message = firebaseErrorMessage(resetError);
          setError(message);
          throw new Error(message);
        }
      },
      demoSignIn(opts) {
        const email = opts?.email?.trim() || "demo@foodflow.in";
        const name = opts?.name?.trim() || nameFromEmail(email);
        const demoUser: User = {
          uid: "demo",
          name,
          email,
          org: opts?.org?.trim() || "FoodFlow Workspace",
          role: opts?.role?.trim() || "Operations",
          initials: initials(name),
        };
        try {
          localStorage.setItem(DEMO_KEY, JSON.stringify(demoUser));
        } catch {
          /* storage unavailable — session stays in memory for this tab */
        }
        setError(null);
        setUser(demoUser);
        setLoading(false);
      },
      async signOut() {
        try {
          localStorage.removeItem(DEMO_KEY);
        } catch {
          /* ignore */
        }
        if (!firebaseConfigError) {
          try {
            const { auth } = requireFirebase();
            await firebaseSignOut(auth);
          } catch {
            /* no live Firebase session to end */
          }
        }
        setUser(null);
      },
    }),
    [user, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function loadProfile(firebaseUser: FirebaseUser, db: ReturnType<typeof requireFirebase>["db"]): Promise<User> {
  const email = firebaseUser.email ?? "";
  const profileRef = doc(db, "users", firebaseUser.uid);
  const snapshot = await getDoc(profileRef);
  if (snapshot.exists()) {
    return userFromProfile(firebaseUser.uid, email, snapshot.data() as Partial<User>);
  }

  const profile = userFromProfile(firebaseUser.uid, email, {
    name: firebaseUser.displayName ?? nameFromEmail(email),
  });
  return profile;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
