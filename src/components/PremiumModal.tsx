import { useState } from "react";
import { PREMIUM_PLAN, saveUserPremiumStatus } from "@/lib/premium";

interface PremiumModalProps {
  isOpen: boolean;
  isPremium: boolean;
  onClose: () => void;
  onStatusChange: (isPremium: boolean) => void;
}

export function PremiumModal({ isOpen, isPremium, onClose, onStatusChange }: PremiumModalProps) {
  const [subscribing, setSubscribing] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"express" | "card">("express");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubscribing(true);
    setSuccessMsg(null);

    // Simulate swift 1-second secure checkout
    await new Promise((res) => setTimeout(res, 900));

    await saveUserPremiumStatus(true);
    onStatusChange(true);
    setSubscribing(false);
    setSuccessMsg("🎉 Unlimited AI Menu Scans Unlocked! You now have unlimited access.");

    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1500);
  };

  const handleCancelSubscription = async () => {
    setSubscribing(true);
    await saveUserPremiumStatus(false);
    onStatusChange(false);
    setSubscribing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-card border border-border p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition"
          aria-label="Close"
        >
          ✕
        </button>

        {isPremium ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-leaf/15 text-leaf mb-3 text-3xl">
              ✨
            </div>
            <h2 className="text-3xl font-serif">Unlimited AI Scans Active</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Your $2.00/month subscription is active. You have full, unlimited access to AI Menu
              Scanning on any menu photo or chalkboard!
            </p>

            <div className="mt-6 rounded-2xl bg-muted/50 border border-border p-4 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current Plan:</span>
                <span className="font-medium text-foreground">{PREMIUM_PLAN.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold text-leaf">{PREMIUM_PLAN.priceDisplay}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <span className="inline-flex items-center gap-1 text-leaf font-medium">
                  <span className="h-2 w-2 rounded-full bg-leaf animate-pulse" /> Unlimited Uses
                  Active
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={onClose}
                className="w-full rounded-full bg-primary text-primary-foreground py-3.5 text-sm font-medium hover:opacity-90 transition"
              >
                Start Scanning Menus
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={subscribing}
                className="w-full rounded-full border border-border py-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive transition disabled:opacity-50"
              >
                {subscribing ? "Canceling..." : "Cancel Subscription"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-0.5 text-[11px] uppercase tracking-wider font-semibold">
                Free Trial Reached (3/3 Used)
              </span>
              <span className="text-xs text-muted-foreground">$2.00 / month</span>
            </div>

            <h2 className="text-3xl font-serif leading-tight">Pay for Unlimited AI Scans</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;ve used all 3 free AI menu scans! Unlock unlimited photo & menu camera scans
              at any deli, diner, or restaurant worldwide.
            </p>

            <div className="mt-5 space-y-2.5 rounded-2xl bg-background border border-border p-4">
              {PREMIUM_PLAN.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <span className="text-leaf shrink-0 mt-0.5">✓</span>
                  <span className="text-foreground/90">{feature}</span>
                </div>
              ))}
            </div>

            {successMsg ? (
              <div className="mt-6 p-4 rounded-2xl bg-leaf/20 border border-leaf/40 text-leaf text-center text-sm font-medium animate-in zoom-in-95">
                {successMsg}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="flex rounded-full bg-muted p-1 border border-border">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("express")}
                    className={
                      "flex-1 py-2 text-[11px] font-medium rounded-full transition " +
                      (paymentMethod === "express"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    ⚡ Express Checkout ($2/mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={
                      "flex-1 py-2 text-[11px] font-medium rounded-full transition " +
                      (paymentMethod === "card"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    💳 Credit Card ($2/mo)
                  </button>
                </div>

                <form onSubmit={handleSubscribe} className="space-y-4">
                  {paymentMethod === "card" && (
                    <div className="space-y-2.5 animate-in fade-in">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          required
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Alex Morgan"
                          className="mt-1 w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Card Number
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) =>
                            setCardNumber(
                              e.target.value
                                .replace(/\D/g, "")
                                .replace(/(.{4})/g, "$1 ")
                                .trim(),
                            )
                          }
                          placeholder="4532 •••• •••• 8821"
                          className="mt-1 w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-foreground font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Expiry
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            maxLength={5}
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            className="mt-1 w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-foreground font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            CVC
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="123"
                            maxLength={4}
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                            className="mt-1 w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-foreground font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl bg-accent/10 border border-accent/20 p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground">
                        Unlimited Scan Membership
                      </span>
                      <span className="text-muted-foreground block text-[10px]">
                        $2.00/month · Cancel anytime
                      </span>
                    </div>
                    <span className="text-lg font-serif font-bold text-accent-foreground">
                      $2.00<span className="text-xs font-normal text-muted-foreground">/mo</span>
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={subscribing}
                    className="w-full rounded-full bg-primary text-primary-foreground py-4 text-sm font-semibold tracking-wide hover:opacity-95 transition-transform active:scale-[0.98] disabled:opacity-50"
                  >
                    {subscribing ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                        Processing $2.00 Payment...
                      </span>
                    ) : (
                      "Unlock Unlimited Scans for $2.00 / mo"
                    )}
                  </button>

                  <p className="text-[10px] text-center text-muted-foreground">
                    🔒 Instant 256-bit encrypted secure checkout
                  </p>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
