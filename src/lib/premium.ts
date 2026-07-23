import { supabase } from "@/integrations/supabase/client";

export const PREMIUM_PLAN = {
  id: "betterorder_premium_monthly",
  name: "The Better Order Premium",
  priceUsd: 2.0,
  billingPeriod: "month",
  priceDisplay: "$2.00 / month",
  description: "Unlock AI Camera Scanning for any deli, diner, or restaurant menu worldwide.",
  features: [
    "📸 Unlimited AI Menu Scanning (Take photos of any paper or board menu)",
    "⚡ Instant AI Health Scores (0-100%) for custom local dishes",
    "🥗 Personalized filtering for health conditions & dietary needs",
    "📊 Complete macro & nutrient breakdowns (protein, sodium, carbs, sugar)",
    "⭐ Automatic identification of top health picks at any venue",
  ],
} as const;

const LOCAL_STORAGE_KEY = "thebetterorder_premium_active";
const FREE_SCANS_KEY = "thebetterorder_free_scans_remaining";
export const MAX_FREE_SCANS = 3;

export function getLocalPremiumStatus(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
}

export function getRemainingFreeScans(): number {
  if (typeof window === "undefined") return MAX_FREE_SCANS;
  const val = window.localStorage.getItem(FREE_SCANS_KEY);
  if (val === null) return MAX_FREE_SCANS;
  const num = parseInt(val, 10);
  return isNaN(num) ? MAX_FREE_SCANS : Math.max(0, num);
}

export function decrementFreeScan(): number {
  if (typeof window === "undefined") return MAX_FREE_SCANS;
  const current = getRemainingFreeScans();
  const next = Math.max(0, current - 1);
  window.localStorage.setItem(FREE_SCANS_KEY, next.toString());
  return next;
}

export function setLocalPremiumStatus(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, "true");
  } else {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

export async function fetchUserPremiumStatus(): Promise<boolean> {
  const local = getLocalPremiumStatus();
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return local;

    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.user.id)
      .maybeSingle();

    if (p && "is_premium" in p && typeof p.is_premium === "boolean") {
      setLocalPremiumStatus(p.is_premium);
      return p.is_premium;
    }
  } catch {
    // Ignore fetch errors, fallback to local storage state
  }
  return local;
}

export async function saveUserPremiumStatus(active: boolean): Promise<void> {
  setLocalPremiumStatus(active);
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;

    await supabase
      .from("profiles")
      .update({ is_premium: active } as Record<string, unknown>)
      .eq("id", u.user.id);
  } catch {
    // Ignore if column doesn't exist yet in DB
  }
}
