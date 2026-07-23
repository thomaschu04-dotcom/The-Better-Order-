import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  HEALTH_CONDITIONS,
  BUDGETS,
  RESTRICTIONS,
  NYC_FAVORITES,
  type HealthConditionId,
  type BudgetId,
  type RestrictionId,
} from "@/lib/chains";
import { saveUserPremiumStatus, getLocalPremiumStatus, PREMIUM_PLAN } from "@/lib/premium";
import { getLocalUserSession } from "@/lib/firebase";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"profile" | "premium">("profile");
  const [displayName, setDisplayName] = useState("");
  const [borough, setBorough] = useState<string>("Manhattan");
  const [zip, setZip] = useState("10011");
  const [conditions, setConditions] = useState<Set<HealthConditionId>>(new Set());
  const [prefs, setPrefs] = useState<Set<RestrictionId>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(["Chipotle", "Sweetgreen", "Shake Shack"]),
  );
  const [budget, setBudget] = useState<BudgetId>("any");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Premium state
  const [isPremium, setIsPremium] = useState<boolean>(() => getLocalPremiumStatus());

  useEffect(() => {
    (async () => {
      const localSess = getLocalUserSession();
      let userRes = null;
      try {
        userRes = await supabase.auth.getUser();
      } catch {
        userRes = { data: { user: null } };
      }
      const u = userRes?.data;
      const userId = u?.user?.id || localSess?.id;
      if (!userId) return;

      const storedProfile =
        typeof window !== "undefined" ? localStorage.getItem("user_profile_data") : null;
      if (storedProfile) {
        try {
          const p = JSON.parse(storedProfile);
          if (p.display_name) setDisplayName(p.display_name);
          if (p.borough) setBorough(p.borough);
          if (p.zip_code) setZip(p.zip_code);
          if (p.health_conditions) setConditions(new Set(p.health_conditions));
          if (p.dietary_preferences) setPrefs(new Set(p.dietary_preferences));
          if (p.favorite_chains) setFavorites(new Set(p.favorite_chains));
          if (p.budget) setBudget(p.budget);
        } catch (err) {
          console.warn("Failed to parse stored user profile", err);
        }
      }

      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (p) {
          setDisplayName(p.display_name ?? (u?.user?.user_metadata?.display_name as string) ?? "");
          setBorough((p as { borough?: string | null }).borough ?? "");
          setZip((p as { zip_code?: string | null }).zip_code ?? "");
          setConditions(new Set((p.health_conditions ?? []) as HealthConditionId[]));
          setPrefs(new Set((p.dietary_preferences ?? []) as RestrictionId[]));
          setFavorites(new Set((p as { favorite_chains?: string[] }).favorite_chains ?? []));
          setBudget((p.budget as BudgetId) ?? "any");
        }
      } catch (err) {
        console.warn("Error fetching profile from Supabase:", err);
      }
    })();
  }, []);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  const saveProfile = async () => {
    setError(null);
    setSaving(true);
    try {
      const effBorough = borough || "Manhattan";
      const effZip = zip && /^\d{5}$/.test(zip) ? zip : "10011";
      const effFavorites =
        favorites.size > 0 ? Array.from(favorites) : ["Chipotle", "Sweetgreen", "Shake Shack"];

      setBorough(effBorough);
      setZip(effZip);
      setFavorites(new Set(effFavorites));

      const localSess = getLocalUserSession();
      let u = null;
      try {
        const uRes = await supabase.auth.getUser();
        u = uRes.data?.user;
      } catch {
        u = null;
      }
      const userId = u?.id || localSess?.id || "user-" + Date.now();
      const userEmail = u?.email || localSess?.email || "user@thebetterorder.com";

      const language =
        typeof window !== "undefined"
          ? window.localStorage.getItem("preferred_language") || "English"
          : "English";

      const profilePayload = {
        id: userId,
        email: userEmail,
        display_name: displayName || localSess?.displayName || "Member",
        borough: effBorough,
        zip_code: effZip,
        health_conditions: Array.from(conditions),
        dietary_preferences: Array.from(prefs),
        favorite_chains: effFavorites,
        budget,
        preferred_language: language,
        onboarded: true,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("user_profile_data", JSON.stringify(profilePayload));
      }

      try {
        await supabase.from("profiles").upsert(profilePayload);
      } catch {
        // ignore offline / supabase persistence warnings
      }
    } catch (err) {
      console.warn("Profile save warning:", err);
    } finally {
      setSaving(false);
      setStep("premium");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const upgradeToUnlimited = async () => {
    await saveUserPremiumStatus(true);
    setIsPremium(true);
  };

  const finishToMainApp = () => {
    navigate({ to: "/app" });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <main className="min-h-screen grain">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/betterorder-logo.png"
            alt="The Better Order"
            width={48}
            height={48}
            className="h-12 w-12"
          />
          <span className="text-serif text-2xl">
            <span className="text-sage">TheBetter</span>
            <span className="text-tomato">Order</span>
          </span>
        </div>
        <button
          onClick={signOut}
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </header>

      <div className="px-5 pb-32 max-w-2xl mx-auto">
        {step === "profile" ? (
          <>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full">
                Step 1 of 2
              </span>
              <span>Profile Setup</span>
            </div>
            <h1 className="text-serif text-4xl mt-3">Personalize your profile</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Tell us where you are and what you like. We'll only show you spots and orders that
              actually fit.
            </p>

            <section className="mt-8">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                className="mt-2 w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-foreground"
              />
            </section>

            <section className="mt-8 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Borough
                </label>
                <select
                  value={borough}
                  onChange={(e) => setBorough(e.target.value)}
                  className="mt-2 w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-foreground"
                >
                  <option value="">Pick one…</option>
                  {BOROUGHS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  ZIP code
                </label>
                <input
                  value={zip}
                  inputMode="numeric"
                  maxLength={5}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="10011"
                  className="mt-2 w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-foreground font-mono"
                />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-serif text-2xl">Dietary needs & restrictions</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Priorities we apply to every menu.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {RESTRICTIONS.map((r) => {
                  const on = prefs.has(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggle(prefs, r.id, setPrefs)}
                      className={
                        "rounded-full px-3.5 py-1.5 text-xs border transition " +
                        (on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:border-foreground")
                      }
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-serif text-2xl">Health conditions</h2>
              <p className="text-xs text-muted-foreground mt-1">
                We'll steer picks away from foods that make these worse.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {HEALTH_CONDITIONS.map((c) => {
                  const on = conditions.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(conditions, c.id, setConditions)}
                      className={
                        "rounded-full px-3.5 py-1.5 text-xs border transition " +
                        (on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:border-foreground")
                      }
                      title={c.note}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-serif text-2xl">Budget</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {BUDGETS.map((b) => {
                  const on = b.id === budget;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setBudget(b.id)}
                      className={
                        "rounded-full px-3.5 py-1.5 text-xs border transition " +
                        (on
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-card text-foreground border-border hover:border-foreground")
                      }
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-serif text-2xl">Favorite fast-food spots</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pick as many as you like. The map will only show these.
              </p>
              <div className="mt-4 space-y-5">
                {NYC_FAVORITES.map((group) => (
                  <div key={group.category}>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                      {group.category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.chains.map((chain) => {
                        const on = favorites.has(chain);
                        return (
                          <button
                            key={chain}
                            onClick={() => toggle(favorites, chain, setFavorites)}
                            className={
                              "rounded-full px-3.5 py-1.5 text-xs border transition " +
                              (on
                                ? "bg-sage text-white border-sage"
                                : "bg-card text-foreground border-border hover:border-foreground")
                            }
                          >
                            {chain}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {error && <p className="text-sm text-destructive mt-6">{error}</p>}

            <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur px-5 py-4">
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full rounded-full bg-primary text-primary-foreground py-4 text-sm font-semibold tracking-wide disabled:opacity-50"
                >
                  {saving ? "Saving Profile…" : "Save & Continue to Premium Options →"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              <span className="bg-leaf/20 text-leaf px-2.5 py-0.5 rounded-full">Step 2 of 2</span>
              <span>Premium AI Scanner Option</span>
            </div>

            <div className="mt-4 rounded-3xl bg-card border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 text-leaf text-xs font-bold uppercase tracking-wider">
                <span>✨ AI Menu Scanner Upgrade</span>
              </div>
              <h2 className="text-serif text-3xl mt-1">{PREMIUM_PLAN.name}</h2>
              <p className="text-sm text-muted-foreground mt-2">{PREMIUM_PLAN.description}</p>

              {/* 3 Free Scans Banner */}
              <div className="mt-5 rounded-2xl bg-leaf/10 border border-leaf/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-leaf flex items-center gap-1.5">
                      🎁 3 Free AI Menu Scans Included
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your account includes 3 free camera/photo scans of any restaurant or deli
                      menu!
                    </p>
                  </div>
                  <button
                    onClick={upgradeToUnlimited}
                    className="shrink-0 rounded-full bg-leaf text-background px-4 py-2.5 text-xs font-bold hover:opacity-90 transition active:scale-98"
                  >
                    {isPremium ? "Unlimited Active ✨" : "Get Unlimited ($2/mo)"}
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Included Features:
                </h3>
                {PREMIUM_PLAN.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-foreground">
                    <span className="text-leaf font-bold">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground">Standard Plan</span>
                  <span className="text-muted-foreground block text-[10px]">
                    Normal user pricing ($2.00/mo)
                  </span>
                </div>
                <span className="text-xl font-serif font-bold text-foreground">
                  $2.00<span className="text-xs font-normal text-muted-foreground">/mo</span>
                </span>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur px-5 py-4">
              <div className="max-w-2xl mx-auto flex gap-3">
                <button
                  onClick={() => setStep("profile")}
                  className="rounded-full border border-border bg-card text-foreground px-5 py-4 text-sm font-medium hover:bg-muted transition"
                >
                  ← Back
                </button>
                <button
                  onClick={finishToMainApp}
                  className="flex-1 rounded-full bg-primary text-primary-foreground py-4 text-sm font-semibold tracking-wide hover:opacity-95 transition shadow"
                >
                  {isPremium ? "Continue to Main App ✨" : "Continue to Main App 🚀"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
