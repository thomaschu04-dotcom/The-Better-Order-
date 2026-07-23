import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  RESTRICTIONS,
  HEALTH_CONDITIONS,
  type RestrictionId,
  type HealthConditionId,
} from "./chains";

const RestrictionIds = RESTRICTIONS.map((r) => r.id) as [RestrictionId, ...RestrictionId[]];
const HealthConditionIds = HEALTH_CONDITIONS.map((h) => h.id) as [
  HealthConditionId,
  ...HealthConditionId[],
];

const Input = z.object({
  chain: z.string().min(1),
  restrictions: z.array(z.enum(RestrictionIds)).default([]),
  healthConditions: z.array(z.enum(HealthConditionIds)).default([]),
  language: z.string().default("English"),
});

const ItemSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  ingredients: z.array(z.string()).default([]),
  price_usd: z.number().default(0),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number().default(0),
  sugar_g: z.number().default(0),
  sodium_mg: z.number().default(0),
  gluten_free: z.boolean().default(false),
  healthScore: z.number().default(70),
  matchReason: z.string().default(""),
});

const MenuSchema = z.object({ items: z.array(ItemSchema) });

export type MenuResult = z.infer<typeof MenuSchema>;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in AI response");
  return JSON.parse(raw.slice(start, end + 1));
}

export const recommendMenu = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<MenuResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    const restrictionLabels = data.restrictions
      .map((id) => RESTRICTIONS.find((r) => r.id === id)?.label)
      .filter(Boolean)
      .join(", ");

    const conditionNotes = data.healthConditions
      .map((id) => {
        const c = HEALTH_CONDITIONS.find((h) => h.id === id);
        return c ? `${c.label} (${c.note})` : null;
      })
      .filter(Boolean)
      .join("; ");

    const prompt = `You are a nutrition expert for fast food chains.

Chain: ${data.chain}
Dietary priorities: ${restrictionLabels || "None — rank by overall healthiness"}.
User health conditions to respect: ${conditionNotes || "None reported"}.
Response language: ${data.language}. Write "description", "ingredients", and "matchReason" fields in ${data.language}. Keep the item "name" as the real menu name from the chain (do not translate brand/product names).

Pick 4-5 REAL current US menu items from ${data.chain} that best fit ALL the priorities AND are safe/appropriate given the user's health conditions above.
Rank best fit first. If a health condition is present, avoid items that would clearly worsen it.

CRITICAL ACCURACY REQUIREMENTS:
- Use the chain's OFFICIAL published nutrition information (from their US website / nutrition PDF) for calories, protein, carbs, fat, fiber, sugar, and sodium. Do not invent numbers.
- Use the chain's current US menu prices. If unsure, use the national average.
- Ingredients must match the chain's actual ingredient statement (bun, sauces, cheese, oils, seasonings, additives).
- If a chain's item has multiple sizes, use the standard/medium size and mention it in the description.

Respond with ONLY a JSON object (no prose, no markdown fences) in this exact shape:
{
  "items": [
    {
      "name": "string",
      "description": "1-sentence ingredient summary (mention size if applicable)",
      "ingredients": ["string", "..."],
      "price_usd": number,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "sugar_g": number,
      "sodium_mg": number (from official nutrition info, in milligrams),
      "gluten_free": boolean,
      "healthScore": number (0-100, overall healthiness),
      "matchReason": "1 short sentence"
    }
  ]
}`;

    const { text } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      maxOutputTokens: 4096,
      prompt,
    });

    const parsed = extractJson(text);
    return MenuSchema.parse(parsed);
  });
