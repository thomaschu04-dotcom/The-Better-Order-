import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { listRewards, redeemReward, type Reward } from "@/lib/rewards.functions";

export const Route = createFileRoute("/_authenticated/rewards")({
  component: RewardsPage,
});

function RewardsPage() {
  const navigate = useNavigate();
  const list = useServerFn(listRewards);
  const redeem = useServerFn(redeemReward);
  const [redeemed, setRedeemed] = useState<{ code: string; name: string } | null>(null);

  const query = useQuery({
    queryKey: ["rewards"],
    queryFn: () => list(),
  });

  const mut = useMutation({
    mutationFn: async (r: Reward) => {
      const res = await redeem({ data: { rewardId: r.id } });
      return { res, r };
    },
    onSuccess: ({ res, r }) => {
      setRedeemed({ code: res.code, name: r.name });
      query.refetch();
    },
  });

  const balance = query.data?.balance ?? 0;
  const rewards = query.data?.rewards ?? [];

  return (
    <main className="min-h-screen grain">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <button onClick={() => navigate({ to: "/app" })} className="flex items-center gap-2.5">
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
        </button>
        <button
          onClick={() => navigate({ to: "/app" })}
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
      </header>

      <div className="px-5 pb-16 max-w-2xl mx-auto">
        <div className="mt-4 rounded-3xl bg-card border border-border p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your balance</p>
          <p className="text-6xl text-serif mt-2">🍔 {balance.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">Earn 1 burger per $1 you order</p>
        </div>

        <h2 className="text-3xl text-serif mt-10 mb-4">Redeem</h2>
        {query.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {query.error && (
          <p className="text-sm text-destructive">{(query.error as Error).message}</p>
        )}

        <ul className="space-y-3">
          {rewards.map((r) => {
            const canRedeem = balance >= r.gems_cost && !mut.isPending;
            return (
              <li
                key={r.id}
                className="rounded-2xl bg-card border border-border p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-lg font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  <p className="text-xs text-accent-foreground/70 mt-1">
                    🍔 {r.gems_cost.toLocaleString()} burgers
                  </p>
                </div>
                <button
                  disabled={!canRedeem}
                  onClick={() => mut.mutate(r)}
                  className="shrink-0 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {canRedeem
                    ? "Redeem"
                    : balance < r.gems_cost
                      ? `${(r.gems_cost - balance).toLocaleString()} more`
                      : "…"}
                </button>
              </li>
            );
          })}
        </ul>

        {mut.error && (
          <p className="text-sm text-destructive mt-4">{(mut.error as Error).message}</p>
        )}
      </div>

      {redeemed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/40"
          onClick={() => setRedeemed(null)}
        >
          <div
            className="max-w-sm w-full rounded-3xl bg-background border border-border p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Redeemed</p>
            <h3 className="text-2xl text-serif mt-2">{redeemed.name}</h3>
            <p className="text-xs text-muted-foreground mt-4">Your code</p>
            <p className="text-3xl font-mono tracking-widest mt-2 text-sage">{redeemed.code}</p>
            <p className="text-xs text-muted-foreground mt-4">
              Show this at the restaurant to claim your reward.
            </p>
            <button
              onClick={() => setRedeemed(null)}
              className="mt-6 w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
