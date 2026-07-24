import { tFor } from "@/lib/translations";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { findNearbyFastFood, geocodeAddress, type NearbyPlace } from "@/lib/nearby.functions";
import { recommendMenu, type MenuResult } from "@/lib/menu.functions";
import { getGemsBalance } from "@/lib/gems.functions";
import { claimOrderRewards } from "@/lib/claim-order.functions";
import { RESTRICTIONS, USDA_DV, type RestrictionId, type HealthConditionId } from "@/lib/chains";
import { chainAppLink } from "@/lib/chain-apps";
import { supabase } from "@/integrations/supabase/client";
import { MenuScanner } from "@/components/MenuScanner";
import { USDANutritionGuide } from "@/components/USDANutritionGuide";
import { PremiumModal } from "@/components/PremiumModal";
import { fetchUserPremiumStatus } from "@/lib/premium";
import { firebaseSignOut } from "@/lib/firebase";
import { InteractiveRestaurantMap } from "@/components/InteractiveRestaurantMap";

type T = (key: string) => string;

export const Route = createFileRoute("/_authenticated/app")({
  component: App,
});

type Coords = { lat: number; lng: number; label: string };
type MenuItem = MenuResult["items"][number];
type CartEntry = { id: string; chain: string; item: MenuItem; qty: number };

const PRICE_BUCKETS = [
  { id: "any", labelKey: "price_any", min: 0, max: Infinity },
  { id: "under5", labelKey: "price_under5", min: 0, max: 5 },
  { id: "5to10", labelKey: "price_5to10", min: 5, max: 10 },
  { id: "10to15", labelKey: "price_10to15", min: 10, max: 15 },
  { id: "over15", labelKey: "price_over15", min: 15, max: Infinity },
] as const;
type PriceBucketId = (typeof PRICE_BUCKETS)[number]["id"];

const LANGUAGES = [
  { code: "English", label: "English" },
  { code: "Spanish", label: "Español" },
  { code: "French", label: "Français" },
  { code: "German", label: "Deutsch" },
  { code: "Italian", label: "Italiano" },
  { code: "Portuguese", label: "Português" },
  { code: "Chinese (Simplified)", label: "中文" },
  { code: "Japanese", label: "日本語" },
  { code: "Korean", label: "한국어" },
  { code: "Hindi", label: "हिन्दी" },
  { code: "Arabic", label: "العربية" },
  { code: "Russian", label: "Русский" },
  { code: "Tagalog", label: "Tagalog" },
] as const;

// 1 gem per $1 spent
const GEMS_PER_DOLLAR = 1;

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

function App() {
  const navigate = useNavigate();
  const [savedZip, setSavedZip] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [places, setPlaces] = useState<NearbyPlace[] | null>(null);
  const [selected, setSelected] = useState<NearbyPlace | null>(null);
  const [picked, setPicked] = useState<Set<RestrictionId>>(new Set());
  const [priceBucket, setPriceBucket] = useState<PriceBucketId>("any");
  const [menu, setMenu] = useState<MenuResult | null>(null);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("English");
  const [gems, setGems] = useState(0);
  const [rewardToast, setRewardToast] = useState<number | null>(null);
  const [healthConditions, setHealthConditions] = useState<HealthConditionId[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [favoriteChains, setFavoriteChains] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [appTab, setAppTab] = useState<"fastfood" | "scanner" | "nutrition">("fastfood");

  const t = tFor(language);
  const fetchBalance = useServerFn(getGemsBalance);
  const claim = useServerFn(claimOrderRewards);
  const [pendingOrder, setPendingOrder] = useState<{ chain: string; total: number } | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetchUserPremiumStatus().then(setIsPremium);
  }, []);

  const handleScannedAddToCart = (scannedItem: MenuItem, venueName: string) => {
    const id = `${venueName}::${scannedItem.name}`;
    setCart((prev) => {
      const existing = prev.find((e) => e.id === id);
      if (existing) {
        return prev.map((e) => (e.id === id ? { ...e, qty: e.qty + 1 } : e));
      }
      return [...prev, { id, chain: venueName, item: scannedItem, qty: 1 }];
    });
    setCartOpen(true);
  };

  // Load profile; if not onboarded, send to /onboarding.
  useEffect(() => {
    (async () => {
      const storedProfile =
        typeof window !== "undefined" ? localStorage.getItem("user_profile_data") : null;

      if (storedProfile) {
        try {
          const p = JSON.parse(storedProfile);
          if (p.display_name) setDisplayName(p.display_name);
          if (p.health_conditions) setHealthConditions(p.health_conditions as HealthConditionId[]);
          if (p.dietary_preferences?.length) {
            setPicked(new Set(p.dietary_preferences as RestrictionId[]));
          }
          if (p.preferred_language) setLanguage(p.preferred_language);
          if (p.favorite_chains) setFavoriteChains(p.favorite_chains);
          if (p.zip_code) setSavedZip(p.zip_code);
        } catch (err) {
          console.warn("Failed to parse stored user profile", err);
        }
      }

      try {
        const { data: u } = await supabase.auth.getUser();
        if (u?.user) {
          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", u.user.id)
            .maybeSingle();

          if (p) {
            setDisplayName(p.display_name ?? "");
            setHealthConditions((p.health_conditions ?? []) as HealthConditionId[]);
            if (p.dietary_preferences?.length) {
              setPicked(new Set(p.dietary_preferences as RestrictionId[]));
            }
            if (p.preferred_language) setLanguage(p.preferred_language);
            const favs = (p as { favorite_chains?: string[] }).favorite_chains ?? [];
            setFavoriteChains(favs);
            setGems((p as { gems_balance?: number }).gems_balance ?? 0);
            const zip = (p as { zip_code?: string | null }).zip_code;
            if (zip) {
              setSavedZip(zip);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load user profile from Supabase:", err);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    fetchBalance()
      .then((r) => setGems(r.balance))
      .catch(() => {});
  }, [fetchBalance]);

  const findNearby = useServerFn(findNearbyFastFood);
  const geocode = useServerFn(geocodeAddress);
  const recommend = useServerFn(recommendMenu);

  const nearbyMut = useMutation({
    mutationFn: async (c: { lat: number; lng: number }) =>
      findNearby({ data: { lat: c.lat, lng: c.lng, favoriteChains } }),
    onSuccess: (data) => {
      const sorted = [...data].sort((a, b) => {
        const aFav = favoriteChains.includes(a.chain);
        const bFav = favoriteChains.includes(b.chain);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.distanceMeters - b.distanceMeters;
      });
      setPlaces(sorted);
    },
  });

  const geocodeMut = useMutation({
    mutationFn: async (address: string) => geocode({ data: { address } }),
    onSuccess: (r) => {
      const c = { lat: r.lat, lng: r.lng, label: r.formatted };
      setCoords(c);
      nearbyMut.mutate({ lat: r.lat, lng: r.lng });
    },
  });

  const menuMut = useMutation({
    mutationFn: async (v: {
      chain: string;
      restrictions: RestrictionId[];
      language: string;
      healthConditions: HealthConditionId[];
      priceBucket: PriceBucketId;
    }) => recommend({ data: v }),
    onSuccess: (data) => setMenu(data),
  });

  const fetchMenuForSelected = (
    chain: string,
    restrictionsSet: Set<RestrictionId>,
    bucket: PriceBucketId,
    lang = language,
  ) => {
    setMenu(null);
    menuMut.mutate({
      chain,
      restrictions: Array.from(restrictionsSet),
      language: lang,
      healthConditions,
      priceBucket: bucket,
    });
  };

  const handleSelectPlace = (p: NearbyPlace) => {
    setSelected(p);
    fetchMenuForSelected(p.chain, picked, priceBucket);
  };

  const handlePriceBucketChange = (bucket: PriceBucketId) => {
    setPriceBucket(bucket);
    if (selected) {
      fetchMenuForSelected(selected.chain, picked, bucket);
    }
  };

  const useGPS = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError(
        "Geolocation is not supported by your browser. Please enter a ZIP code or address below.",
      );
      return;
    }
    setGpsLoading(true);

    const handleSuccess = (pos: GeolocationPosition) => {
      const c = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: "Your current GPS location",
      };
      setCoords(c);
      nearbyMut.mutate({ lat: c.lat, lng: c.lng });
      setGpsLoading(false);
    };

    const handleError = (err: GeolocationPositionError) => {
      if (err.code === err.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (err2) => {
            setGpsLoading(false);
            if (err2.code === err2.PERMISSION_DENIED) {
              setGpsError(
                "Location permission denied. Please allow location access or enter a ZIP code below.",
              );
            } else {
              setGpsError("GPS request timed out. Please enter a ZIP code or city name below.");
            }
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
        );
        return;
      }

      setGpsLoading(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsError(
          "Location permission blocked or denied in your browser. Enter a ZIP code or address below.",
        );
      } else {
        setGpsError("Unable to determine your location. Enter a ZIP code or city name below.");
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 60000,
    });
  };

  const submitAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) geocodeMut.mutate(addressInput.trim());
  };

  const submitZip = (zip: string) => {
    if (/^\d{5}$/.test(zip)) geocodeMut.mutate(zip);
  };

  const toggle = (id: RestrictionId) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
    if (selected) {
      fetchMenuForSelected(selected.chain, next, priceBucket);
    }
  };

  const runRecommend = () => {
    if (!selected) return;
    fetchMenuForSelected(selected.chain, picked, priceBucket);
  };

  const signOut = async () => {
    await firebaseSignOut();
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore supabase signOut errors
    }
    navigate({ to: "/auth" });
  };

  const editProfile = () => navigate({ to: "/onboarding" });

  const backToPlaces = () => {
    setSelected(null);
    setMenu(null);
    setPicked(new Set());
  };

  const reset = () => {
    setCoords(null);
    setPlaces(null);
    setSelected(null);
    setMenu(null);
    setAddressInput("");
    setPicked(new Set());
    setPriceBucket("any");
    setGpsLoading(false);
    setGpsError(null);
  };

  const addToCart = (item: MenuItem) => {
    if (!selected) return;
    const id = `${selected.chain}::${item.name}`;
    setCart((prev) => {
      const existing = prev.find((e) => e.id === id);
      if (existing) {
        return prev.map((e) => (e.id === id ? { ...e, qty: e.qty + 1 } : e));
      }
      return [...prev, { id, chain: selected.chain, item, qty: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((e) => (e.id === id ? { ...e, qty: e.qty + delta } : e)).filter((e) => e.qty > 0),
    );
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((s, e) => s + e.qty, 0);

  const checkout = () => {
    const total = cart.reduce((s, e) => s + e.item.price_usd * e.qty, 0);
    const chains = Array.from(new Set(cart.map((e) => e.chain)));
    const primary = chains[0] ?? selected?.chain ?? "";
    // Open each chain's own app / ordering page.
    chains.forEach((chain, i) => {
      const { url } = chainAppLink(chain);
      setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), i * 150);
    });
    if (primary && total > 0) {
      setPendingOrder({ chain: primary, total });
      setOrderNumber("");
      setClaimError(null);
    }
    setCart([]);
    setCartOpen(false);
  };

  const submitClaim = async () => {
    if (!pendingOrder) return;
    const num = orderNumber.trim();
    if (num.length < 2) {
      setClaimError("Enter the order number from your receipt.");
      return;
    }
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await claim({
        data: { restaurant: pendingOrder.chain, orderNumber: num, amountUsd: pendingOrder.total },
      });
      setGems(res.balance);
      setRewardToast(res.earned);
      setTimeout(() => setRewardToast(null), 3500);
      setPendingOrder(null);
      setOrderNumber("");
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : "Couldn't claim burgers.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <main className="min-h-screen grain">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between gap-3">
          <button onClick={reset} className="flex items-center gap-2.5">
            <img
              src="/betterorder-logo.png"
              alt="The Better Order logo"
              width={44}
              height={44}
              className="h-11 w-11"
            />
            <span className="text-serif text-2xl leading-none">
              <span className="text-sage">TheBetter</span>
              <span className="text-tomato">Order</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => {
                const nextLang = e.target.value;
                setLanguage(nextLang);
                if (selected) {
                  fetchMenuForSelected(selected.chain, picked, priceBucket, nextLang);
                }
              }}
              className="rounded-full bg-card border border-border px-3 py-1.5 text-xs outline-none focus:border-foreground cursor-pointer"
              aria-label="Language"
              title="Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <Link
              to="/rewards"
              className="rounded-full bg-accent/20 text-accent-foreground px-3 py-1.5 text-xs font-medium flex items-center gap-1 hover:bg-accent/30 transition"
              title="Rewards"
            >
              🍔 {gems.toLocaleString()}
            </Link>
            <button
              onClick={() => setPremiumModalOpen(true)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition " +
                (isPremium
                  ? "bg-leaf/20 text-leaf hover:bg-leaf/30"
                  : "bg-accent/20 text-accent-foreground hover:bg-accent/30")
              }
              title="AI Menu Scanner ($2/mo)"
            >
              📸 {isPremium ? "Scanner ✨" : "Scan Menu ($2/mo)"}
            </button>
            {cartCount > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                className="rounded-full bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium"
              >
                {t("cart")} · {cartCount}
              </button>
            )}
            {coords && (
              <button
                onClick={reset}
                className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                {t("startOver")}
              </button>
            )}
            <button
              onClick={editProfile}
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              title={displayName ? `Profile — ${displayName}` : "Profile"}
            >
              Profile
            </button>
            <button
              onClick={signOut}
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
        {coords && <p className="mt-2 text-xs text-muted-foreground truncate">📍 {coords.label}</p>}
      </header>

      <div className="px-5 pb-24">
        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-xl mx-auto">
          <button
            onClick={() => setAppTab("fastfood")}
            className={
              "flex-1 py-2.5 px-3.5 rounded-full text-xs font-semibold border transition shadow-sm whitespace-nowrap " +
              (appTab === "fastfood"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-foreground")
            }
          >
            🍔 Fast Food Chains
          </button>
          <button
            onClick={() => setAppTab("scanner")}
            className={
              "flex-1 py-2.5 px-3.5 rounded-full text-xs font-semibold border transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap " +
              (appTab === "scanner"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-foreground")
            }
          >
            <span>📸 Scan Any Menu</span>
            {isPremium ? (
              <span className="text-[9px] bg-leaf text-background px-1.5 py-0.5 rounded-full font-bold">
                PRO
              </span>
            ) : (
              <span className="text-[9px] bg-accent/30 text-accent-foreground px-1.5 py-0.5 rounded-full font-bold">
                $2/mo
              </span>
            )}
          </button>
          <button
            onClick={() => setAppTab("nutrition")}
            className={
              "flex-1 py-2.5 px-3.5 rounded-full text-xs font-semibold border transition shadow-sm whitespace-nowrap " +
              (appTab === "nutrition"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-foreground")
            }
          >
            🥗 USDA Nutrition Guide
          </button>
        </div>

        {appTab === "nutrition" ? (
          <USDANutritionGuide language={language} />
        ) : appTab === "scanner" ? (
          <MenuScanner
            isPremium={isPremium}
            onOpenPremiumModal={() => setPremiumModalOpen(true)}
            restrictions={Array.from(picked)}
            healthConditions={healthConditions}
            language={language}
            onAddToCart={handleScannedAddToCart}
          />
        ) : (
          <>
            {!coords && (
              <LocationStep
                t={t}
                onGPS={useGPS}
                onAddress={submitAddress}
                addressInput={addressInput}
                setAddressInput={setAddressInput}
                onZip={submitZip}
                savedZip={savedZip}
                loading={geocodeMut.isPending || nearbyMut.isPending || gpsLoading}
                gpsError={gpsError}
                error={geocodeMut.error?.message}
              />
            )}

            {coords && !selected && (
              <PlacesStep
                t={t}
                loading={nearbyMut.isPending}
                error={nearbyMut.error?.message}
                places={places}
                onSelect={handleSelectPlace}
                onBack={reset}
                userCoords={coords}
                apiKey={API_KEY}
                favoriteChains={favoriteChains}
              />
            )}

            {selected && coords && (
              <MenuStep
                t={t}
                place={selected}
                userCoords={coords}
                apiKey={API_KEY}
                picked={picked}
                onToggle={toggle}
                priceBucket={priceBucket}
                onPriceBucket={handlePriceBucketChange}
                onBack={backToPlaces}
                onRun={runRecommend}
                loading={menuMut.isPending}
                error={menuMut.error?.message}
                menu={menu}
                onAddToCart={addToCart}
                cart={cart}
              />
            )}
          </>
        )}
      </div>

      {cartOpen && (
        <CartDrawer
          t={t}
          cart={cart}
          onClose={() => setCartOpen(false)}
          onChangeQty={changeQty}
          onClear={clearCart}
          onCheckout={checkout}
        />
      )}

      {pendingOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-background border border-border p-6">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("order_placed_title")}
            </p>
            <h3 className="text-2xl text-serif mt-1">{pendingOrder.chain}</h3>
            <p className="text-sm text-muted-foreground mt-3">{t("order_placed_body")}</p>
            <div className="mt-4 rounded-2xl bg-accent/10 border border-accent/30 p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("youllEarn")}
              </p>
              <p className="text-lg font-medium mt-0.5">
                🍔 {Math.floor(pendingOrder.total).toLocaleString()} {t("gems")}
              </p>
            </div>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder={t("order_number_placeholder")}
              className="mt-4 w-full rounded-full border border-border bg-card px-5 py-3.5 text-sm outline-none focus:border-foreground"
              autoFocus
            />
            {claimError && <p className="text-xs text-destructive mt-2">{claimError}</p>}
            <button
              onClick={submitClaim}
              disabled={claiming || orderNumber.trim().length < 2}
              className="mt-4 w-full rounded-full bg-primary text-primary-foreground py-3.5 text-sm font-medium disabled:opacity-50 transition-transform active:scale-[0.98]"
            >
              {claiming ? "…" : t("claim_burgers")}
            </button>
            <button
              onClick={() => {
                setPendingOrder(null);
                setOrderNumber("");
                setClaimError(null);
              }}
              className="mt-2 w-full text-xs uppercase tracking-widest text-muted-foreground py-2 hover:text-foreground"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}

      {rewardToast !== null && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-leaf text-background px-5 py-2.5 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-4">
          🍔 +{rewardToast} {t("gemsEarned")}
        </div>
      )}

      <PremiumModal
        isOpen={premiumModalOpen}
        isPremium={isPremium}
        onClose={() => setPremiumModalOpen(false)}
        onStatusChange={setIsPremium}
      />

      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur px-5 py-3 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        {t("footer")}
      </footer>
    </main>
  );
}

/* ---------- Steps ---------- */

function LocationStep(props: {
  t: T;
  onGPS?: () => void;
  onAddress: (e: React.FormEvent) => void;
  addressInput: string;
  setAddressInput: (v: string) => void;
  onZip: (zip: string) => void;
  savedZip?: string;
  loading: boolean;
  gpsError?: string | null;
  error?: string;
}) {
  const { t } = props;
  const [zip, setZip] = useState(props.savedZip || "");

  useEffect(() => {
    if (props.savedZip) {
      setZip(props.savedZip);
    }
  }, [props.savedZip]);
  return (
    <section className="mt-6">
      <h1 className="text-5xl leading-[0.95] text-serif">
        {t("tagline1")}
        <br /> {t("tagline2")}
      </h1>
      <p className="mt-4 text-muted-foreground max-w-md">{t("intro")}</p>

      <div className="mt-8 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onZip(zip);
          }}
          className="flex gap-2"
        >
          <input
            value={zip}
            inputMode="numeric"
            maxLength={5}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="ZIP code (e.g. 10001)"
            className="flex-1 rounded-full border border-border bg-card px-5 py-4 text-sm outline-none focus:border-foreground"
          />
          <button
            type="submit"
            disabled={props.loading || zip.length !== 5}
            className="rounded-full bg-primary text-primary-foreground px-6 text-sm font-medium transition-transform active:scale-[0.97] disabled:opacity-50 touch-manipulation"
          >
            {props.loading ? "…" : "Find"}
          </button>
        </form>

        <form onSubmit={props.onAddress} className="flex gap-2">
          <input
            value={props.addressInput}
            onChange={(e) => props.setAddressInput(e.target.value)}
            placeholder={t("addressPlaceholder")}
            className="flex-1 rounded-full border border-border bg-card px-5 py-4 text-sm outline-none focus:border-foreground"
          />
          <button
            type="submit"
            disabled={props.loading}
            className="rounded-full bg-accent text-accent-foreground px-6 text-sm font-medium transition-transform active:scale-[0.97] disabled:opacity-50 touch-manipulation"
          >
            {props.loading ? "…" : t("go")}
          </button>
        </form>
        {props.error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive text-center">
            {props.error}
          </div>
        )}
      </div>
    </section>
  );
}

function PlacesStep(props: {
  t: T;
  loading: boolean;
  error?: string;
  places: NearbyPlace[] | null;
  onSelect: (p: NearbyPlace) => void;
  onBack: () => void;
  userCoords: Coords;
  apiKey: string;
  favoriteChains?: string[];
}) {
  const { t } = props;
  const [selectedPlaceOnMap, setSelectedPlaceOnMap] = useState<NearbyPlace | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlaces = useMemo(() => {
    if (!props.places) return [];
    if (!searchQuery.trim()) return props.places;
    const q = searchQuery.toLowerCase().trim();
    return props.places.filter(
      (p) => p.chain.toLowerCase().includes(q) || p.address.toLowerCase().includes(q),
    );
  }, [props.places, searchQuery]);

  const BackBtn = (
    <button
      onClick={props.onBack}
      className="text-xs uppercase tracking-widest text-muted-foreground mb-3 hover:text-foreground transition-transform active:scale-[0.97]"
    >
      ← Change location
    </button>
  );

  if (props.loading) {
    return (
      <section className="mt-4">
        {BackBtn}
        <SkeletonList label={t("scanning")} />
      </section>
    );
  }

  if (!props.places || props.places.length === 0) {
    return (
      <section className="mt-4">
        {BackBtn}
        <p className="text-sm text-muted-foreground mt-6">{t("noPlaces")}</p>
      </section>
    );
  }

  return (
    <section className="mt-4">
      {BackBtn}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h2 className="text-2xl text-serif">
          {filteredPlaces.length} {t("spotsNearby")}
        </h2>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter restaurants by name (e.g. Chipotle)..."
          className="rounded-full border border-border bg-card px-4 py-2 text-xs outline-none focus:border-foreground min-w-[220px]"
        />
      </div>

      {/* Interactive Google Map / Proximity Radar */}
      <InteractiveRestaurantMap
        apiKey={props.apiKey}
        userCoords={props.userCoords}
        places={filteredPlaces}
        selectedPlace={selectedPlaceOnMap}
        onSelectPlace={setSelectedPlaceOnMap}
        onViewMenu={(p) => props.onSelect(p)}
        favoriteChains={props.favoriteChains}
      />

      {filteredPlaces.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          No restaurants match "{searchQuery}". Try clearing your search filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredPlaces.map((p) => {
            const isFav = props.favoriteChains?.includes(p.chain);
            const isMapFocused = selectedPlaceOnMap?.id === p.id;
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${props.userCoords.lat},${props.userCoords.lng}&destination=${p.lat},${p.lng}&travelmode=driving`;
            const locationUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.chain + " " + p.address)}`;

            return (
              <li
                key={p.id}
                className={
                  "rounded-2xl bg-card border p-4.5 transition-all shadow-sm " +
                  (isMapFocused
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border hover:border-foreground/40")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-foreground">{p.chain}</span>
                      {isFav && (
                        <span className="text-[10px] uppercase font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                          ❤️ Favorite Chain
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-semibold bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
                        {formatDistance(p.distanceMeters)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{p.address}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => props.onSelect(p)}
                    className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-sm"
                  >
                    🥗 View Healthy Menu
                  </button>

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold hover:bg-emerald-800 transition active:scale-95 flex items-center gap-1 shadow-sm"
                  >
                    🧭 Directions on Google Maps ↗
                  </a>

                  <a
                    href={locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-muted text-foreground/80 hover:text-foreground px-3.5 py-2 text-xs font-medium border border-border hover:bg-muted/80 transition flex items-center gap-1"
                  >
                    📍 Open Location ↗
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MenuStep(props: {
  t: T;
  place: NearbyPlace;
  userCoords: Coords;
  apiKey: string;
  picked: Set<RestrictionId>;
  onToggle: (id: RestrictionId) => void;
  priceBucket: PriceBucketId;
  onPriceBucket: (id: PriceBucketId) => void;
  onBack: () => void;
  onRun: () => void;
  loading: boolean;
  error?: string;
  menu: MenuResult | null;
  onAddToCart: (item: MenuItem) => void;
  cart: CartEntry[];
}) {
  const { t } = props;
  const [showMap, setShowMap] = useState(false);
  const bucket = PRICE_BUCKETS.find((b) => b.id === props.priceBucket)!;
  const filtered = useMemo(() => {
    if (!props.menu) return null;
    if (props.priceBucket === "any") return props.menu.items;
    return props.menu.items.filter(
      (it) => it.price_usd === 0 || (it.price_usd >= bucket.min && it.price_usd <= bucket.max),
    );
  }, [props.menu, props.priceBucket, bucket]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${props.userCoords.lat},${props.userCoords.lng}&destination=${props.place.lat},${props.place.lng}&destination_place_id=${props.place.id}&travelmode=driving`;

  return (
    <section className="mt-4">
      <button
        onClick={props.onBack}
        className="text-xs uppercase tracking-widest text-muted-foreground mb-3 hover:text-foreground"
      >
        {t("backNearby")}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h2 className="text-4xl text-serif">{props.place.chain}</h2>
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
            📍 {props.place.address}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="rounded-full bg-accent/20 text-accent-foreground px-3.5 py-1.5 text-xs font-semibold hover:bg-accent/30 transition flex items-center gap-1"
          >
            🗺️ {showMap ? "Hide Map" : "Show Map & Directions"}
          </button>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-bold hover:opacity-90 transition flex items-center gap-1 shadow-sm"
          >
            🧭 Directions ↗
          </a>
        </div>
      </div>

      {/* Optional Interactive Map Banner */}
      {showMap && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
          <InteractiveRestaurantMap
            apiKey={props.apiKey}
            userCoords={props.userCoords}
            places={[props.place]}
            selectedPlace={props.place}
            onSelectPlace={() => {}}
          />
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          {t("yourPriorities")}
        </p>
        <div className="flex flex-wrap gap-2">
          {RESTRICTIONS.map((r) => {
            const on = props.picked.has(r.id);
            return (
              <button
                key={r.id}
                onClick={() => props.onToggle(r.id)}
                className={
                  "rounded-full px-3.5 py-1.5 text-xs border transition " +
                  (on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-foreground")
                }
              >
                {t(`r_${r.id}`)}
              </button>
            );
          })}
        </div>

        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-6 mb-3">
          {t("priceRange")}
        </p>
        <div className="flex flex-wrap gap-2">
          {PRICE_BUCKETS.map((b) => {
            const on = b.id === props.priceBucket;
            return (
              <button
                key={b.id}
                onClick={() => props.onPriceBucket(b.id)}
                className={
                  "rounded-full px-3.5 py-1.5 text-xs border transition " +
                  (on
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-foreground border-border hover:border-foreground")
                }
              >
                {t(b.labelKey)}
              </button>
            );
          })}
        </div>

        <button
          onClick={props.onRun}
          disabled={props.loading}
          className="mt-5 w-full rounded-full bg-accent text-accent-foreground py-4 text-sm font-medium disabled:opacity-50"
        >
          {props.loading ? t("reading") : props.menu ? t("refresh") : t("showHealthiest")}
        </button>
        {props.error && <p className="text-xs text-destructive mt-2">{props.error}</p>}
      </div>

      {props.loading && (
        <div className="mt-8">
          <SkeletonList
            label={`Finding best ${props.place.chain} options for your priorities & price range…`}
          />
        </div>
      )}

      {!props.loading && props.menu && filtered && (
        <div className="mt-8 space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noItemsInRange")}</p>
          ) : (
            filtered.map((item, i) => {
              const id = `${props.place.chain}::${item.name}`;
              const inCart = props.cart.find((e) => e.id === id)?.qty ?? 0;
              return (
                <MenuItemCard
                  key={i}
                  t={t}
                  item={item}
                  inCart={inCart}
                  onAdd={() => props.onAddToCart(item)}
                  showSodium={props.picked.has("low_sodium")}
                  showSugar={props.picked.has("sugar_free")}
                />
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

function MenuItemCard({
  item,
  onAdd,
  inCart,
  t,
  showSodium,
  showSugar,
}: {
  item: MenuItem;
  onAdd: () => void;
  inCart: number;
  t: T;
  showSodium?: boolean;
  showSugar?: boolean;
}) {
  const [showIngredients, setShowIngredients] = useState(false);
  const sodiumPct = Math.min(200, Math.round(((item.sodium_mg ?? 0) / USDA_DV.sodium_mg) * 100));
  const sugarPct = Math.min(200, Math.round(((item.sugar_g ?? 0) / USDA_DV.added_sugar_g) * 100));
  const scoreColor =
    item.healthScore >= 75
      ? { badge: "bg-leaf/15 text-leaf", bar: "bg-leaf" }
      : item.healthScore >= 50
        ? { badge: "bg-accent/20 text-accent-foreground", bar: "bg-accent" }
        : { badge: "bg-destructive/15 text-destructive", bar: "bg-destructive" };

  return (
    <article className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl text-serif">{item.name}</h3>
        <span
          className={`shrink-0 text-[10px] uppercase tracking-widest rounded-full px-2 py-1 ${scoreColor.badge}`}
        >
          {item.healthScore}% {t("healthy")}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {item.price_usd > 0 && (
          <span className="text-xs font-medium text-foreground">${item.price_usd.toFixed(2)}</span>
        )}
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full transition-all ${scoreColor.bar}`}
          style={{ width: `${Math.max(0, Math.min(100, item.healthScore))}%` }}
        />
      </div>

      <p className="text-xs mt-3 italic text-foreground/80">"{item.matchReason}"</p>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Macro label={t("macro_kcal")} value={item.calories} />
        <Macro label={t("macro_protein")} value={`${item.protein_g}g`} />
        <Macro label={t("macro_carbs")} value={`${item.carbs_g}g`} />
        <Macro label={t("macro_fat")} value={`${item.fat_g}g`} />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        <Macro label={t("macro_fiber")} value={`${item.fiber_g}g`} muted />
        <Macro label={t("macro_sugar")} value={`${item.sugar_g}g`} muted />
        <Macro label={t("macro_sodium")} value={`${item.sodium_mg ?? 0}mg`} muted />
        <Macro
          label={t("macro_gluten")}
          value={item.gluten_free ? t("gluten_free_yes") : t("gluten_free_no")}
          muted
        />
      </div>

      {showSodium && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Sodium</span>
            <span>
              {sodiumPct}% {t("usda_sodium")}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full ${sodiumPct >= 100 ? "bg-destructive" : sodiumPct >= 50 ? "bg-accent" : "bg-leaf"}`}
              style={{ width: `${Math.min(100, sodiumPct)}%` }}
            />
          </div>
        </div>
      )}
      {showSugar && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Sugar</span>
            <span>
              {sugarPct}% {t("usda_sugar")}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full ${sugarPct >= 100 ? "bg-destructive" : sugarPct >= 50 ? "bg-accent" : "bg-leaf"}`}
              style={{ width: `${Math.min(100, sugarPct)}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={onAdd}
        className="mt-4 w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 transition"
      >
        {inCart > 0 ? `${t("addAnother")} (${inCart} ${t("inCart")})` : t("addToCart")}
      </button>

      {item.ingredients.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowIngredients((v) => !v)}
            className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground py-2 border-t border-border"
          >
            <span>
              {t("ingredients")} ({item.ingredients.length})
            </span>
            <span className={"transition-transform " + (showIngredients ? "rotate-180" : "")}>
              ▾
            </span>
          </button>
          {showIngredients && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {item.ingredients.map((ing, idx) => (
                <li
                  key={idx}
                  className="text-xs rounded-full bg-muted text-foreground/80 px-2.5 py-1"
                >
                  {ing}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function CartDrawer({
  cart,
  onClose,
  onChangeQty,
  onClear,
  onCheckout,
  t,
}: {
  cart: CartEntry[];
  onClose: () => void;
  onChangeQty: (id: string, delta: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  t: T;
}) {
  const totals = cart.reduce(
    (acc, e) => {
      const q = e.qty;
      acc.calories += e.item.calories * q;
      acc.protein += e.item.protein_g * q;
      acc.carbs += e.item.carbs_g * q;
      acc.fat += e.item.fat_g * q;
      acc.fiber += e.item.fiber_g * q;
      acc.sugar += e.item.sugar_g * q;
      acc.price += e.item.price_usd * q;
      acc.scoreWeighted += e.item.healthScore * q;
      acc.qty += q;
      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      price: 0,
      scoreWeighted: 0,
      qty: 0,
    },
  );
  const combinedScore = totals.qty > 0 ? Math.round(totals.scoreWeighted / totals.qty) : 0;
  const scoreColor =
    combinedScore >= 75
      ? { badge: "bg-leaf/15 text-leaf", bar: "bg-leaf" }
      : combinedScore >= 50
        ? { badge: "bg-accent/20 text-accent-foreground", bar: "bg-accent" }
        : { badge: "bg-destructive/15 text-destructive", bar: "bg-destructive" };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close cart"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <aside className="relative w-full max-w-md bg-background border-l border-border overflow-y-auto">
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="text-2xl text-serif">{t("yourMeal")}</h2>
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            {t("close")}
          </button>
        </div>

        {cart.length === 0 ? (
          <p className="px-5 py-12 text-sm text-muted-foreground text-center">{t("cartEmpty")}</p>
        ) : (
          <>
            <div className="px-5 py-5 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("combinedScore")}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-widest rounded-full px-2 py-1 ${scoreColor.badge}`}
                >
                  {combinedScore}% {t("healthy")}
                </span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${scoreColor.bar}`}
                  style={{ width: `${Math.max(0, Math.min(100, combinedScore))}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                <Macro label={t("macro_kcal")} value={Math.round(totals.calories)} />
                <Macro label={t("macro_protein")} value={`${Math.round(totals.protein)}g`} />
                <Macro label={t("macro_carbs")} value={`${Math.round(totals.carbs)}g`} />
                <Macro label={t("macro_fat")} value={`${Math.round(totals.fat)}g`} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <Macro label={t("macro_fiber")} value={`${Math.round(totals.fiber)}g`} muted />
                <Macro label={t("macro_sugar")} value={`${Math.round(totals.sugar)}g`} muted />
                <Macro label={t("macro_total")} value={`$${totals.price.toFixed(2)}`} muted />
              </div>
            </div>

            <ul className="divide-y divide-border">
              {cart.map((e) => (
                <li key={e.id} className="px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.item.name}</p>
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-0.5">
                        {e.chain} · ${(e.item.price_usd * e.qty).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onChangeQty(e.id, -1)}
                        className="w-7 h-7 rounded-full border border-border hover:border-foreground text-sm"
                      >
                        −
                      </button>
                      <span className="text-sm w-5 text-center">{e.qty}</span>
                      <button
                        onClick={() => onChangeQty(e.id, +1)}
                        className="w-7 h-7 rounded-full border border-border hover:border-foreground text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {e.item.calories} {t("macro_kcal")} · {e.item.protein_g}p / {e.item.carbs_g}c /{" "}
                    {e.item.fat_g}f · {e.item.healthScore}% {t("healthy")}
                  </p>
                </li>
              ))}
            </ul>

            <div className="px-5 py-5 space-y-3">
              <div className="rounded-2xl bg-accent/10 border border-accent/30 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {t("youllEarn")}
                  </p>
                  <p className="text-lg font-medium mt-0.5">
                    🍔 {Math.round(totals.price * GEMS_PER_DOLLAR).toLocaleString()} {t("gems")}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground text-right max-w-[50%]">
                  {t("gemsRule")}
                </p>
              </div>
              <button
                onClick={onCheckout}
                className="w-full rounded-full bg-primary text-primary-foreground py-4 text-sm font-medium hover:opacity-90 transition"
              >
                {t("open_restaurant_app")} {cart[0]?.chain ?? ""} · ${totals.price.toFixed(2)}
              </button>
              <p className="text-[10px] text-center text-muted-foreground -mt-1">
                Opens the restaurant's own app to place your order.
              </p>
              <button
                onClick={onClear}
                className="w-full rounded-full border border-border py-3 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground transition"
              >
                {t("clearCart")}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Macro({
  label,
  value,
  muted,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
}) {
  return (
    <div className={"rounded-xl py-2 " + (muted ? "bg-muted" : "bg-secondary")}>
      <div className="text-base font-medium">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}

function SkeletonList({ label }: { label: string }) {
  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">{label}</p>
      <ul className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="h-[68px] rounded-2xl bg-card border border-border animate-pulse" />
        ))}
      </ul>
    </section>
  );
}

function formatDistance(m: number) {
  const feet = m * 3.28084;
  if (feet < 1000) return `${Math.round(feet)} ft`;
  return `${(m / 1609.344).toFixed(1)} mi`;
}
