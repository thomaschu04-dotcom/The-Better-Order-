import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI, Type } from "@google/genai";
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

const ScanInput = z.object({
  base64Image: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
  restaurantName: z.string().optional(),
  restrictions: z.array(z.enum(RestrictionIds)).default([]),
  healthConditions: z.array(z.enum(HealthConditionIds)).default([]),
  language: z.string().default("English"),
});

const ScannedItemSchema = z.object({
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
  isTopChoice: z.boolean().default(false),
});

const ScannedMenuSchema = z.object({
  restaurantName: z.string().default("Scanned Menu"),
  summary: z.string().default(""),
  items: z.array(ScannedItemSchema),
});

export type ScannedMenuResult = z.infer<typeof ScannedMenuSchema>;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in AI response");
  return JSON.parse(raw.slice(start, end + 1));
}

export const scanMenuImage = createServerFn({ method: "POST" })
  .validator((d: unknown) => ScanInput.parse(d))
  .handler(async ({ data }): Promise<ScannedMenuResult> => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("API key is not configured for AI scanning.");
    }

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

    // Clean base64 string if data URL prefix exists
    let cleanBase64 = data.base64Image;
    if (cleanBase64.includes(";base64,")) {
      cleanBase64 = cleanBase64.split(";base64,")[1];
    }

    const systemPrompt = `You are an expert clinical nutritionist and menu AI analyzer.
You are given a photo of a restaurant or deli menu.
${data.restaurantName ? `Restaurant/Deli Name: ${data.restaurantName}` : "Identify the venue name if visible on the menu, or use 'Local Deli / Restaurant'."}

User Dietary Priorities: ${restrictionLabels || "Overall healthiness, clean eating, balanced nutrients"}.
User Health Conditions: ${conditionNotes || "None reported"}.
Language for response: ${data.language}. Write descriptions and match reasons in ${data.language}.

INSTRUCTIONS:
1. Examine the menu image thoroughly. Read all item names, descriptions, prices, and ingredients visible.
2. Identify 4 to 8 distinct menu items from the image.
3. For each item:
   - Estimate realistic nutrition facts based on standard culinary recipes for these items (calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg in mg, gluten_free boolean).
   - If price is visible on the menu, extract it as price_usd. If not visible, estimate a reasonable price based on the venue type.
   - Calculate a Health Score (0 to 100) based on how wholesome, nutrient-dense, and aligned the item is with the user's dietary priorities and health conditions.
   - Highlight 1 or 2 items with "isTopChoice": true that represent the BEST overall health options on this specific menu.
   - Provide a 1-sentence "matchReason" explaining why this option is healthy or how it fits the user's needs.

Return ONLY a JSON object in this exact schema:
{
  "restaurantName": "string",
  "summary": "Short 1-2 sentence overview of the healthiest choices found on this menu",
  "items": [
    {
      "name": "string",
      "description": "string",
      "ingredients": ["string"],
      "price_usd": number,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "sugar_g": number,
      "sodium_mg": number,
      "gluten_free": boolean,
      "healthScore": number,
      "matchReason": "string",
      "isTopChoice": boolean
    }
  ]
}`;

    if (process.env.GEMINI_API_KEY) {
      // Use official @google/genai SDK directly
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: data.mimeType,
                data: cleanBase64,
              },
            },
            {
              text: systemPrompt,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              restaurantName: { type: Type.STRING },
              summary: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    ingredients: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    price_usd: { type: Type.NUMBER },
                    calories: { type: Type.NUMBER },
                    protein_g: { type: Type.NUMBER },
                    carbs_g: { type: Type.NUMBER },
                    fat_g: { type: Type.NUMBER },
                    fiber_g: { type: Type.NUMBER },
                    sugar_g: { type: Type.NUMBER },
                    sodium_mg: { type: Type.NUMBER },
                    gluten_free: { type: Type.BOOLEAN },
                    healthScore: { type: Type.NUMBER },
                    matchReason: { type: Type.STRING },
                    isTopChoice: { type: Type.BOOLEAN },
                  },
                  required: ["name", "calories", "protein_g", "carbs_g", "fat_g", "healthScore"],
                },
              },
            },
            required: ["restaurantName", "summary", "items"],
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI menu scanner.");
      const parsed = JSON.parse(text);
      return ScannedMenuSchema.parse(parsed);
    } else {
      // Fallback via Vercel AI SDK / Gateway provider
      const gateway = createLovableAiGatewayProvider(apiKey);
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        maxOutputTokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: `data:${data.mimeType};base64,${cleanBase64}`,
              },
              {
                type: "text",
                text: systemPrompt,
              },
            ],
          },
        ],
      });

      const parsed = extractJson(text);
      return ScannedMenuSchema.parse(parsed);
    }
  });
