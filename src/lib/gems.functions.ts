import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EarnInput = z.object({
  amountUsd: z.number().min(0),
  restaurant: z.string().optional(),
});

export const earnGems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => EarnInput.parse(d))
  .handler(async ({ data, context }) => {
    const gems = Math.floor(data.amountUsd);
    if (gems <= 0) return { earned: 0, balance: 0 };
    const { supabase, userId } = context;

    const { error: txErr } = await supabase.from("gem_transactions").insert({
      user_id: userId,
      delta: gems,
      reason: "order",
      restaurant: data.restaurant ?? null,
      order_total_usd: data.amountUsd,
    });
    if (txErr) throw txErr;

    const { data: profile, error: readErr } = await supabase
      .from("profiles")
      .select("gems_balance")
      .eq("id", userId)
      .maybeSingle();
    if (readErr) throw readErr;
    const nextBalance = (profile?.gems_balance ?? 0) + gems;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ gems_balance: nextBalance })
      .eq("id", userId);
    if (updErr) throw updErr;

    return { earned: gems, balance: nextBalance };
  });

export const getGemsBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("gems_balance")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return { balance: data?.gems_balance ?? 0 };
  });
