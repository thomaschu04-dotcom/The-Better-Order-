import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { scanMenuImage, type ScannedMenuResult } from "@/lib/scanner.functions";
import { USDA_DV, type RestrictionId, type HealthConditionId } from "@/lib/chains";
import { getRemainingFreeScans, decrementFreeScan, MAX_FREE_SCANS } from "@/lib/premium";

export type ScannedMenuItem = ScannedMenuResult["items"][number];

interface MenuScannerProps {
  isPremium: boolean;
  onOpenPremiumModal: () => void;
  restrictions: RestrictionId[];
  healthConditions: HealthConditionId[];
  language: string;
  onAddToCart: (
    item: {
      name: string;
      description: string;
      ingredients: string[];
      price_usd: number;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      fiber_g: number;
      sugar_g: number;
      sodium_mg: number;
      gluten_free: boolean;
      healthScore: number;
      matchReason: string;
    },
    restaurantName: string,
  ) => void;
}

export function MenuScanner({
  isPremium,
  onOpenPremiumModal,
  restrictions,
  healthConditions,
  language,
  onAddToCart,
}: MenuScannerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [scannedResult, setScannedResult] = useState<ScannedMenuResult | null>(null);
  const [scanStep, setScanStep] = useState<string>("");
  const [freeScansRemaining, setFreeScansRemaining] = useState<number>(getRemainingFreeScans);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFreeScansRemaining(getRemainingFreeScans());
  }, [isPremium]);

  const scanFn = useServerFn(scanMenuImage);

  const scanMutation = useMutation({
    mutationFn: async (payload: { base64Image: string; mimeType: string }) => {
      setScanStep("Reading menu image with Gemini AI...");
      await new Promise((r) => setTimeout(r, 400));
      setScanStep("Calculating health scores & nutrient breakdown...");
      return scanFn({
        data: {
          base64Image: payload.base64Image,
          mimeType: payload.mimeType,
          restrictions,
          healthConditions,
          language,
        },
      });
    },
    onSuccess: (res) => {
      setScannedResult(res);
      setScanStep("");
      if (!isPremium) {
        const next = decrementFreeScan();
        setFreeScansRemaining(next);
      }
    },
    onError: () => {
      setScanStep("");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPremium && freeScansRemaining <= 0) {
      onOpenPremiumModal();
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setMimeType(file.type || "image/jpeg");
      setScannedResult(null);

      // Start scan
      scanMutation.mutate({
        base64Image: base64,
        mimeType: file.type || "image/jpeg",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleResetScan = () => {
    setSelectedImage(null);
    setScannedResult(null);
    setScanStep("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="mt-6 rounded-3xl bg-card border border-border p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📸</span>
            <h2 className="text-2xl font-serif">AI Menu Scanner</h2>
            {isPremium ? (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold bg-leaf/20 text-leaf px-2.5 py-0.5 rounded-full">
                ✨ Unlimited AI Scans
              </span>
            ) : freeScansRemaining > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold bg-leaf/20 text-leaf px-2.5 py-0.5 rounded-full">
                🎁 {freeScansRemaining} of {MAX_FREE_SCANS} Free Scans Left
              </span>
            ) : (
              <button
                onClick={onOpenPremiumModal}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full hover:bg-amber-500/30 transition"
              >
                🔒 0 Free Scans Left — Unlock Unlimited ($2/mo)
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Scan any paper or board menu from delis, diners, or local restaurants to get AI health
            scores & smart choices.
          </p>
        </div>

        {!isPremium && (
          <button
            onClick={onOpenPremiumModal}
            className={
              "shrink-0 rounded-full px-4 py-2 text-xs font-semibold hover:opacity-90 transition active:scale-98 " +
              (freeScansRemaining === 0
                ? "bg-primary text-primary-foreground font-bold shadow-md animate-pulse"
                : "bg-accent text-accent-foreground")
            }
          >
            {freeScansRemaining === 0 ? "Pay for Unlimited ($2/mo)" : "Unlimited Scans ($2/mo)"}
          </button>
        )}
      </div>

      {!selectedImage && (
        <div className="space-y-5">
          {/* Main Upload / Camera Box */}
          <div
            onClick={() => {
              if (!isPremium && freeScansRemaining <= 0) {
                onOpenPremiumModal();
              } else {
                fileInputRef.current?.click();
              }
            }}
            className={
              "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 " +
              (isPremium || freeScansRemaining > 0
                ? "border-primary/50 hover:border-primary bg-primary/5 hover:bg-primary/10"
                : "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10")
            }
          >
            <div className="h-16 w-16 rounded-full bg-background border border-border flex items-center justify-center text-3xl shadow-sm">
              📷
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isPremium
                  ? "Take Photo or Upload Menu Image"
                  : freeScansRemaining > 0
                    ? `Take Photo or Upload Menu Image (${freeScansRemaining} Free Scans Remaining)`
                    : "Used 3/3 Free Scans — Upgrade for Unlimited Uses ($2/mo)"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Supports camera snapshots, photos, deli chalkboards, printed paper menus, or digital
                menu images.
              </p>
            </div>

            <button
              type="button"
              className={
                "mt-2 rounded-full px-5 py-2.5 text-xs font-semibold shadow-sm transition " +
                (isPremium || freeScansRemaining > 0
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground font-bold hover:opacity-90")
              }
            >
              {isPremium
                ? "Open Camera / Choose Photo"
                : freeScansRemaining > 0
                  ? `Use 1 Free Scan (${freeScansRemaining} Left)`
                  : "Unlock Unlimited Scans ($2.00 / month)"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      {/* Image Preview & Scanning Progress State */}
      {selectedImage && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {scannedResult?.restaurantName || "Scanned Menu"}
            </span>
            <button
              onClick={handleResetScan}
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              ← Scan Another Menu
            </button>
          </div>

          {/* Scanning Animation Header */}
          {scanMutation.isPending && (
            <div className="rounded-2xl bg-primary/10 border border-primary/30 p-5 text-center space-y-3 animate-in fade-in">
              <div className="relative mx-auto h-40 w-full max-w-xs rounded-xl overflow-hidden border border-border bg-black/80 shadow-md">
                <img
                  src={selectedImage}
                  alt="Menu being scanned"
                  className="h-full w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-transparent to-primary/30 animate-pulse" />
                <div className="absolute inset-x-0 h-1 bg-primary shadow-[0_0_12px_#22c55e] animate-[bounce_2s_infinite]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-primary animate-pulse">
                  {scanStep || "Analyzing menu image with AI..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Reading item text, estimating macros, and calculating health scores...
                </p>
              </div>
            </div>
          )}

          {scanMutation.isError && (
            <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 text-center text-xs text-destructive space-y-2">
              <p>Couldn't process menu image. Please ensure the menu photo is clear and legible.</p>
              <button
                onClick={handleResetScan}
                className="underline font-semibold text-destructive hover:opacity-80"
              >
                Try again
              </button>
            </div>
          )}

          {/* Results Display */}
          {scannedResult && (
            <div className="space-y-6 animate-in fade-in">
              {/* Summary Header */}
              <div className="rounded-2xl bg-secondary p-4 border border-border">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xl font-serif text-foreground">
                    {scannedResult.restaurantName}
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider bg-leaf/20 text-leaf px-2.5 py-1 rounded-full font-semibold">
                    {scannedResult.items.length} Options Identified
                  </span>
                </div>
                {scannedResult.summary && (
                  <p className="text-xs text-foreground/80 mt-2 italic leading-relaxed">
                    "{scannedResult.summary}"
                  </p>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Health-Ranked Choices
                </h4>

                {scannedResult.items.map((item, idx) => {
                  const sodiumPct = Math.min(
                    200,
                    Math.round(((item.sodium_mg ?? 0) / USDA_DV.sodium_mg) * 100),
                  );
                  const scoreColor =
                    item.healthScore >= 75
                      ? { badge: "bg-leaf/15 text-leaf", bar: "bg-leaf" }
                      : item.healthScore >= 50
                        ? { badge: "bg-accent/20 text-accent-foreground", bar: "bg-accent" }
                        : { badge: "bg-destructive/15 text-destructive", bar: "bg-destructive" };

                  return (
                    <article
                      key={idx}
                      className={
                        "rounded-2xl bg-background border p-5 transition-all shadow-sm " +
                        (item.isTopChoice ? "border-leaf ring-1 ring-leaf/40" : "border-border")
                      }
                    >
                      {item.isTopChoice && (
                        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-leaf text-background px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          ⭐ Top Health Pick
                        </div>
                      )}

                      <div className="flex items-baseline justify-between gap-3">
                        <h5 className="text-xl font-serif font-medium text-foreground">
                          {item.name}
                        </h5>
                        <span
                          className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold rounded-full px-2.5 py-1 ${scoreColor.badge}`}
                        >
                          {item.healthScore}% Healthy
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {item.price_usd > 0 && (
                          <span className="text-xs font-semibold text-foreground">
                            ${item.price_usd.toFixed(2)}
                          </span>
                        )}
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>

                      {/* Health Score Bar */}
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${scoreColor.bar}`}
                          style={{ width: `${Math.max(0, Math.min(100, item.healthScore))}%` }}
                        />
                      </div>

                      {item.matchReason && (
                        <p className="text-xs mt-3 italic text-foreground/80">
                          "{item.matchReason}"
                        </p>
                      )}

                      {/* Macros Grid */}
                      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-secondary py-1.5">
                          <div className="font-semibold">{item.calories}</div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            kcal
                          </div>
                        </div>
                        <div className="rounded-xl bg-secondary py-1.5">
                          <div className="font-semibold">{item.protein_g}g</div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            protein
                          </div>
                        </div>
                        <div className="rounded-xl bg-secondary py-1.5">
                          <div className="font-semibold">{item.carbs_g}g</div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            carbs
                          </div>
                        </div>
                        <div className="rounded-xl bg-secondary py-1.5">
                          <div className="font-semibold">{item.fat_g}g</div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            fat
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-muted py-1.5">
                          <div className="font-semibold text-muted-foreground">{item.fiber_g}g</div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            fiber
                          </div>
                        </div>
                        <div className="rounded-xl bg-muted py-1.5">
                          <div className="font-semibold text-muted-foreground">{item.sugar_g}g</div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            sugar
                          </div>
                        </div>
                        <div className="rounded-xl bg-muted py-1.5">
                          <div className="font-semibold text-muted-foreground">
                            {item.sodium_mg}mg
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            sodium
                          </div>
                        </div>
                        <div className="rounded-xl bg-muted py-1.5">
                          <div className="font-semibold text-muted-foreground">
                            {item.gluten_free ? "free" : "—"}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            gluten
                          </div>
                        </div>
                      </div>

                      {/* Sodium Indicator */}
                      {item.sodium_mg > 0 && (
                        <div className="mt-3">
                          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                            <span>Sodium</span>
                            <span>{sodiumPct}% of daily limit (2,300mg)</span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full ${sodiumPct >= 100 ? "bg-destructive" : sodiumPct >= 50 ? "bg-accent" : "bg-leaf"}`}
                              style={{ width: `${Math.min(100, sodiumPct)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() =>
                          onAddToCart(
                            {
                              name: item.name,
                              description: item.description,
                              ingredients: item.ingredients,
                              price_usd: item.price_usd,
                              calories: item.calories,
                              protein_g: item.protein_g,
                              carbs_g: item.carbs_g,
                              fat_g: item.fat_g,
                              fiber_g: item.fiber_g,
                              sugar_g: item.sugar_g,
                              sodium_mg: item.sodium_mg,
                              gluten_free: item.gluten_free,
                              healthScore: item.healthScore,
                              matchReason: item.matchReason,
                            },
                            scannedResult.restaurantName,
                          )
                        }
                        className="mt-4 w-full rounded-full bg-primary text-primary-foreground py-2.5 text-xs font-semibold hover:opacity-90 transition active:scale-98"
                      >
                        + Add Scanned Item to Cart / Meal
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
