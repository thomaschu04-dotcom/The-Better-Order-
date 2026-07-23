import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Reward = {
  id: string;
  name: string;
  description: string;
  gems_cost: number;
  restaurant: string | null;
};

export const listRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ balance: number; rewards: Reward[] }> => {
    const [profileRes, rewardsRes] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("gems_balance")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("rewards_catalog")
        .select("id, name, description, gems_cost, restaurant")
        .order("gems_cost"),
    ]);
    if (profileRes.error) throw profileRes.error;
    if (rewardsRes.error) throw rewardsRes.error;
    return {
      balance: profileRes.data?.gems_balance ?? 0,
      rewards: (rewardsRes.data ?? []) as Reward[],
    };
  });

const RedeemInput = z.object({ rewardId: z.string().uuid() });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => RedeemInput.parse(d))
  .handler(async ({ data, context }): Promise<{ code: string; balance: number }> => {
    const { data: row, error } = await context.supabase
      .from("reward_redemptions")
      .insert({ user_id: context.userId, reward_id: data.rewardId, gems_spent: 0 })
      .select("code")
      .single();
    if (error) throw error;
    const { data: p } = await context.supabase
      .from("profiles")
      .select("gems_balance")
      .eq("id", context.userId)
      .maybeSingle();
    return { code: row.code as string, balance: p?.gems_balance ?? 0 };
  });
