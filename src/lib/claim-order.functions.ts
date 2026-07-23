import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  restaurant: z.string().min(1),
  orderNumber: z.string().min(2).max(64),
  amountUsd: z.number().min(0),
});

export const claimOrderRewards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const gems = Math.floor(data.amountUsd);

    const { error: insErr } = await supabase.from("order_claims").insert({
      user_id: userId,
      restaurant: data.restaurant,
      order_number: data.orderNumber.trim(),
      amount_usd: data.amountUsd,
      gems_awarded: gems,
    });
    if (insErr) {
      // Unique violation → already claimed
      if ((insErr as { code?: string }).code === "23505") {
        throw new Error("This order number has already been used to claim burgers.");
      }
      throw insErr;
    }

    if (gems > 0) {
      const { error: txErr } = await supabase.from("gem_transactions").insert({
        user_id: userId,
        delta: gems,
        reason: "order_claim",
        restaurant: data.restaurant,
        order_total_usd: data.amountUsd,
      });
      if (txErr) throw txErr;

      const { data: p } = await supabase
        .from("profiles")
        .select("gems_balance")
        .eq("id", userId)
        .maybeSingle();
      const nextBalance = (p?.gems_balance ?? 0) + gems;
      await supabase.from("profiles").update({ gems_balance: nextBalance }).eq("id", userId);
      return { earned: gems, balance: nextBalance };
    }

    return { earned: 0, balance: 0 };
  });
