import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
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
  priceBucket: z.string().default("any"),
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
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");

    const ai = new GoogleGenAI({ apiKey: key });

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

    const PRICE_RANGE_MAP: Record<string, string> = {
      under5: "UNDER $5.00 total per item (value/budget menu items)",
      "5to10": "between $5.00 and $10.00 per item",
      "10to15": "between $10.00 and $15.00 per item",
      over15: "OVER $15.00 per item (family combos / large meals)",
      any: "Any price range",
    };

    const priceText = PRICE_RANGE_MAP[data.priceBucket] || "Any price range";

    const prompt = `You are a nutrition expert for fast food chains.

Chain: ${data.chain}
Dietary priorities: ${restrictionLabels || "None — rank by overall healthiness"}.
User health conditions to respect: ${conditionNotes || "None reported"}.
Price range budget: ${priceText}.
Response language: ${data.language}. Write "description", "ingredients", and "matchReason" fields in ${data.language}. Keep the item "name" as the real menu name from the chain (do not translate brand/product names).

Pick 4-5 REAL current US menu items from ${data.chain} that best fit ALL the dietary priorities AND fit within the target price range (${priceText}) AND are safe/appropriate given the user's health conditions above.
Rank best fit first. If a health condition is present, avoid items that would clearly worsen it. In "matchReason", state concisely why it fits their dietary priorities and price budget.

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
      "sodium_mg": number,
      "gluten_free": boolean,
      "healthScore": number (0-100, overall healthiness),
      "matchReason": "1 short sentence"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    const parsed = extractJson(text);
    return MenuSchema.parse(parsed);
  });
