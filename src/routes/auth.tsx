import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translations, tFor } from "@/lib/translations";
import {
  signInWithGoogleFirebase,
  signInWithEmailFirebase,
  signUpWithEmailFirebase,
  setLocalUserSession,
} from "@/lib/firebase";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) throw redirect({ to: "/onboarding" });
    } catch (err) {
      if ((err as { to?: string })?.to) throw err;
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window === "undefined") return "English";
    return window.localStorage.getItem("preferred_language") || "English";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = tFor(language);

  useEffect(() => {
    window.localStorage.setItem("preferred_language", language);
  }, [language]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/onboarding" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmailFirebase(email, password, displayName);
        try {
          await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: { display_name: displayName },
            },
          });
        } catch {
          // ignore optional supabase backup sign up error
        }
      } else {
        await signInWithEmailFirebase(email, password);
        try {
          await supabase.auth.signInWithPassword({ email, password });
        } catch {
          // ignore optional supabase backup sign in error
        }
      }
      navigate({ to: "/onboarding" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("authError"));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = () => {
    setLocalUserSession({
      id: "demo-guest-" + Date.now(),
      email: "guest@thebetterorder.com",
      displayName: "Guest User",
    });
    navigate({ to: "/onboarding" });
  };

  const google = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogleFirebase();
      navigate({ to: "/onboarding" });
    } catch {
      handleGuestSignIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grain flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/betterorder-logo.png"
            alt="TheBetterOrder"
            width={152}
            height={152}
            className="h-36 w-36 mb-3"
          />
          <span className="text-serif text-6xl leading-none tracking-tight">
            <span className="text-sage">TheBetter</span>
            <span className="text-tomato">Order</span>
          </span>
          <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            {t("tagline") || "Healthy choices, anywhere"}
          </p>
        </div>

        <label className="block mb-4">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("selectLanguage") || "Select a language"}
          </span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1.5 w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-foreground"
          >
            {Object.keys(translations).map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-3xl bg-card border border-border p-6">
          <h1 className="text-serif text-3xl">
            {mode === "signin"
              ? t("welcomeBack") || "Welcome back"
              : t("createAccount") || "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin"
              ? t("signInSub") || "Sign in to get personalized fast-food picks."
              : t("signUpSub") || "Save your health profile and unlock personalized picks."}
          </p>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={google}
              className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {t("continueGoogle") || "Continue with Google"}
            </button>

            <button
              type="button"
              onClick={handleGuestSignIn}
              className="w-full rounded-full border border-border bg-card text-foreground py-2.5 text-xs font-semibold hover:bg-muted transition"
            >
              ⚡ Instant 1-Click Guest Access
            </button>
          </div>

          <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> {t("or")}{" "}
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("yourName") || "Your name"}
                className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email") || "Email"}
              className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password") || "Password"}
              className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium disabled:opacity-50"
            >
              {loading
                ? "…"
                : mode === "signin"
                  ? t("signIn") || "Sign in"
                  : t("createAccountBtn") || "Create account"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="mt-4 w-full text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? t("newHere") || "New here? Create an account"
              : t("haveAccount") || "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
