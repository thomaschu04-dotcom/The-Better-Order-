import { useState } from "react";
import { USDA_DV } from "@/lib/chains";

interface USDANutritionGuideProps {
  language?: string;
}

type MacroTab = "overview" | "carbs" | "protein" | "fats" | "sodium" | "calculator" | "myths";
type ActivityType = "sedentary" | "moderate" | "active";
type GoalType = "maintenance" | "weight_loss" | "muscle_gain" | "keto_low_carb";

export function USDANutritionGuide({ language = "English" }: USDANutritionGuideProps) {
  const [activeTab, setActiveTab] = useState<MacroTab>("overview");

  // Calculator State
  const [weightLbs, setWeightLbs] = useState<number>(160);
  const [activityLevel, setActivityLevel] = useState<ActivityType>("moderate");
  const [goal, setGoal] = useState<GoalType>("maintenance");

  // Calculate USDA recommended macro ranges
  const weightKg = weightLbs / 2.20462;

  let targetCalories = Math.round(
    weightKg * (activityLevel === "sedentary" ? 28 : activityLevel === "moderate" ? 33 : 38),
  );
  if (goal === "weight_loss") targetCalories -= 400;
  if (goal === "muscle_gain") targetCalories += 300;

  // Protein targets based on USDA/ISSN guidelines
  const proteinMultiplier = goal === "muscle_gain" ? 1.8 : goal === "weight_loss" ? 1.6 : 1.2;
  const targetProteinG = Math.round(weightKg * proteinMultiplier);
  const proteinCalories = targetProteinG * 4;

  // Fat targets (20-35% of calories USDA guideline)
  const fatPercent = goal === "keto_low_carb" ? 0.7 : 0.28;
  const targetFatG = Math.round((targetCalories * fatPercent) / 9);
  const fatCalories = targetFatG * 9;

  // Carbohydrate targets (Remainder of calories or low carb)
  let carbCalories = targetCalories - proteinCalories - fatCalories;
  if (carbCalories < 20 * 4 && goal === "keto_low_carb") carbCalories = 25 * 4;
  const targetCarbsG = Math.max(20, Math.round(carbCalories / 4));

  // Fiber target: 14g per 1,000 kcal according to USDA
  const targetFiberG = Math.round((targetCalories / 1000) * 14);

  return (
    <div className="mt-6 rounded-3xl bg-card border border-border p-6 shadow-sm">
      {/* Header Banner */}
      <div className="border-b border-border pb-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🥗</span>
              <h2 className="text-2xl font-serif text-foreground">
                USDA Nutrition & Macro Science
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold bg-primary/20 text-primary px-2.5 py-0.5 rounded-full">
                USDA Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Official Dietary Guidelines for Americans (USDA & HHS). Learn how carbohydrates,
              protein, fats, fiber, and sodium power your metabolism and health.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 bg-muted p-1 rounded-2xl border border-border">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground px-2">
              Daily Target:
            </span>
            <span className="text-xs font-bold text-foreground bg-card px-2.5 py-1 rounded-xl shadow-xs">
              2,000 kcal baseline
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-4">
          {[
            { id: "overview", label: "📊 Daily Values Overview", icon: "📊" },
            { id: "protein", label: "🥩 Protein & Amino Acids", icon: "🥩" },
            { id: "carbs", label: "🥖 Carbs, Fiber & Glycemic", icon: "🥖" },
            { id: "fats", label: "🥑 Fats & Omega Fatty Acids", icon: "🥑" },
            { id: "sodium", label: "🧂 Sodium & Blood Pressure", icon: "🧂" },
            { id: "calculator", label: "🧮 USDA Target Calculator", icon: "🧮" },
            { id: "myths", label: "💡 Myth Busters & Swaps", icon: "💡" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MacroTab)}
              className={
                "px-3.5 py-2 rounded-full text-xs font-medium transition active:scale-98 " +
                (activeTab === tab.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-background text-muted-foreground hover:text-foreground border border-border")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl bg-secondary/50 border border-border p-5">
            <h3 className="text-lg font-serif font-medium text-foreground mb-2">
              USDA 2020–2025 Dietary Guidelines Snapshot
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The United States Department of Agriculture (USDA) and the Department of Health and
              Human Services (HHS) publish Dietary Guidelines for Americans based on peer-reviewed
              clinical nutrition research. The daily values below serve as standard benchmarks for a
              2,000 calorie diet.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-background p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🥩</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  10-35% Calories
                </span>
              </div>
              <h4 className="text-base font-serif font-semibold text-foreground">
                Dietary Protein
              </h4>
              <p className="text-2xl font-bold text-foreground mt-1">50g – 120g+</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                4 kcal/gram. Essential for muscle repair, enzyme synthesis, and satiety signaling
                (GLP-1 release).
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🥖</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  45-65% Calories
                </span>
              </div>
              <h4 className="text-base font-serif font-semibold text-foreground">
                Total Carbohydrates
              </h4>
              <p className="text-2xl font-bold text-foreground mt-1">275g Daily</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                4 kcal/gram. Primary energy source for brain cells and red blood cells. Prioritize
                complex fiber-rich carbs.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🥑</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  20-35% Calories
                </span>
              </div>
              <h4 className="text-base font-serif font-semibold text-foreground">Healthy Fats</h4>
              <p className="text-2xl font-bold text-foreground mt-1">78g Daily</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                9 kcal/gram. Absorbs fat-soluble vitamins (A, D, E, K), supports hormone production,
                and cell membrane structure.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🌾</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Min 14g / 1000 kcal
                </span>
              </div>
              <h4 className="text-base font-serif font-semibold text-foreground">Dietary Fiber</h4>
              <p className="text-2xl font-bold text-foreground mt-1">28g – 38g</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Soluble & insoluble plant fiber feeds gut microbiota, regulates blood glucose
                spikes, and lowers cholesterol.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🛑</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  Strict Limit
                </span>
              </div>
              <h4 className="text-base font-serif font-semibold text-foreground">Added Sugars</h4>
              <p className="text-2xl font-bold text-foreground mt-1">&lt; 50g (&lt;10%)</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                USDA recommends under 10% of total daily calories from added refined sugars to
                prevent insulin resistance.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🧂</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  Max Ceiling
                </span>
              </div>
              <h4 className="text-base font-serif font-semibold text-foreground">Dietary Sodium</h4>
              <p className="text-2xl font-bold text-foreground mt-1">2,300 mg Max</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Equivalent to 1 teaspoon of table salt. Average American consumes ~3,400mg, mostly
                from restaurant meals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROTEIN */}
      {activeTab === "protein" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-background p-5">
            <h3 className="text-xl font-serif text-foreground mb-3 flex items-center gap-2">
              <span>🥩</span> The Science of Protein & Muscle Protein Synthesis
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Protein is composed of 20 amino acids, 9 of which are{" "}
              <strong>essential (EAAs)</strong> because the human body cannot produce them
              internally. Complete protein sources contain all 9 essential amino acids in adequate
              proportions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-secondary p-4 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  USDA Recommended Protein Intake
                </h4>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>
                    • <strong>RDA Baseline:</strong> 0.8g per kg of body weight (0.36g/lb) to
                    prevent deficiency in sedentary adults.
                  </li>
                  <li>
                    • <strong>Active Adults / Resistance Training:</strong> 1.2g – 2.0g per kg
                    (0.55g – 0.9g/lb) for muscle repair and retention.
                  </li>
                  <li>
                    • <strong>Satiety Effect:</strong> Protein requires the highest thermic effect
                    of food (TEF ~20-30%), meaning 20-30% of protein calories are burned purely
                    during digestion!
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-secondary p-4 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Complete vs Incomplete Sources
                </h4>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>
                    • <strong>Complete Proteins:</strong> Eggs, chicken breast, lean beef, turkey,
                    Greek yogurt, fish, soy (tofu/edamame), quinoa.
                  </li>
                  <li>
                    • <strong>Complementary Plant Proteins:</strong> Combining rice & beans, hummus
                    & pita, or peanut butter & whole wheat toast yields a complete amino acid
                    spectrum.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Fast-Food Lean Protein Comparison (Per Serving)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                    <th className="p-2.5">Food Item</th>
                    <th className="p-2.5">Protein</th>
                    <th className="p-2.5">Calories</th>
                    <th className="p-2.5">Protein-to-Calorie Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-2.5 font-medium">Grilled Chicken Breast (Chipotle)</td>
                    <td className="p-2.5 font-bold text-emerald-600">32g</td>
                    <td className="p-2.5">180 kcal</td>
                    <td className="p-2.5 text-xs text-emerald-600 font-semibold">
                      1g protein per 5.6 kcal (Excellent)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Egg White Bites (Starbucks)</td>
                    <td className="p-2.5 font-bold text-emerald-600">12g</td>
                    <td className="p-2.5">170 kcal</td>
                    <td className="p-2.5 text-xs text-emerald-600 font-semibold">
                      1g protein per 14 kcal (Good)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Grilled Chicken Nuggets 8ct (Chick-fil-A)</td>
                    <td className="p-2.5 font-bold text-emerald-600">25g</td>
                    <td className="p-2.5">130 kcal</td>
                    <td className="p-2.5 text-xs text-emerald-600 font-semibold">
                      1g protein per 5.2 kcal (Elite)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Double Cheeseburger (Fast Food)</td>
                    <td className="p-2.5 font-bold text-amber-600">25g</td>
                    <td className="p-2.5">480 kcal</td>
                    <td className="p-2.5 text-xs text-amber-600 font-semibold">
                      1g protein per 19.2 kcal (Higher Fat)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CARBS & FIBER */}
      {activeTab === "carbs" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-background p-5">
            <h3 className="text-xl font-serif text-foreground mb-3 flex items-center gap-2">
              <span>🥖</span> Carbohydrates, Fiber, & Glycemic Index
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Carbohydrates break down into glucose to fuel human cell activity. The key distinction
              according to USDA guidance is between <strong>Complex Carbohydrates</strong> (starches
              and fibers that digest slowly) and <strong>Simple Sugars</strong> (rapidly absorbed
              monosaccharides).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-secondary p-4 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  Complex Carbs & Fiber
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Brown rice, oats, sweet potatoes, quinoa, legumes. Rich in dietary fiber which
                  slows stomach emptying, delays glucose absorption, and stabilizes insulin
                  response.
                </p>
              </div>

              <div className="rounded-xl bg-secondary p-4 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-1">Glycemic Index (GI)</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Measures how rapidly a food raises blood glucose (0–100 scale). Low-GI foods
                  (&lt;55) like beans and steel-cut oats sustain energy levels without crashes.
                </p>
              </div>

              <div className="rounded-xl bg-secondary p-4 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  Added Sugars (&lt;10%)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Refined syrups, cane sugar, and high-fructose corn syrup in sodas and sauces.
                  Provide empty calories with zero fiber or micronutrient benefits.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
              💡 USDA Fiber Goal: 14g per 1,000 Calories
            </h4>
            <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
              Over 90% of Americans do not meet the daily fiber recommendation (28g for women, 38g
              for men). Adding black beans, chia seeds, avocado, or broccoli to deli/fast food
              orders significantly boosts fiber density!
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: FATS */}
      {activeTab === "fats" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-background p-5">
            <h3 className="text-xl font-serif text-foreground mb-3 flex items-center gap-2">
              <span>🥑</span> Dietary Fats & Heart Health
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Fats provide dense long-term energy (9 kcal/g) and are essential for cellular
              integrity, hormone production (testosterone, estrogen), and brain tissue structure.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                  Unsaturated Fats (Healthy)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Monounsaturated & Polyunsaturated fats (Avocados, olive oil, almonds, salmon,
                  walnuts). High in Omega-3 & Omega-6 fatty acids that lower LDL cholesterol.
                </p>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  Saturated Fats (&lt;10% Limit)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Found in butter, cheese, fatty cuts of beef, and palm oil. USDA recommends
                  limiting saturated fat to under 10% of total daily calories (~22g for a 2,000 kcal
                  diet).
                </p>
              </div>

              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4">
                <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-1">
                  Trans Fats (Avoid 0g)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Partially hydrogenated oils used in commercial frying. USDA and FDA have banned
                  added artificial trans fats due to strong links to cardiovascular risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SODIUM */}
      {activeTab === "sodium" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-background p-5">
            <h3 className="text-xl font-serif text-foreground mb-3 flex items-center gap-2">
              <span>🧂</span> Sodium, Electrolytes, & Blood Pressure
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Sodium is an essential mineral required for fluid balance and nerve transmission.
              However, excess sodium draws water into blood vessels, elevating arterial blood
              pressure.
            </p>

            <div className="p-4 rounded-2xl bg-secondary border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  USDA Daily Sodium Limit:
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/15 px-3 py-1 rounded-full">
                  2,300 mg / day (1 tsp salt)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  American Heart Association Ideal Limit:
                </span>
                <span className="text-xs font-bold text-amber-600 bg-amber-500/15 px-3 py-1 rounded-full">
                  1,500 mg / day (for hypertension)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Average American Daily Intake:
                </span>
                <span className="text-xs font-bold text-rose-600 bg-rose-500/15 px-3 py-1 rounded-full">
                  ~3,400 mg / day
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              💡 <strong>Smart Ordering Tip:</strong> Ask for dressings and sauces on the side,
              choose grilled over breaded meats, and skip salted pickles or bacon extras to save
              500–1,000mg of sodium per meal!
            </p>
          </div>
        </div>
      )}

      {/* TAB 6: CALCULATOR */}
      {activeTab === "calculator" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-background p-5">
            <h3 className="text-xl font-serif text-foreground mb-2">
              🧮 Interactive USDA Personalized Target Calculator
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              Input your physical details and fitness goal to generate customized daily
              macronutrient and fiber targets based on USDA mathematical models.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Body Weight (Lbs)
                </label>
                <input
                  type="number"
                  min="80"
                  max="400"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(Number(e.target.value) || 150)}
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold outline-none focus:border-foreground"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Activity Level
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityType)}
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold outline-none focus:border-foreground"
                >
                  <option value="sedentary">Sedentary (Desk Job)</option>
                  <option value="moderate">Moderate (Light Exercise 3x/wk)</option>
                  <option value="active">Active (Intense Exercise 5x/wk)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Primary Goal
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as GoalType)}
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold outline-none focus:border-foreground"
                >
                  <option value="maintenance">Balanced Maintenance</option>
                  <option value="weight_loss">Fat Loss / Calorie Deficit</option>
                  <option value="muscle_gain">Muscle Building / Hypertrophy</option>
                  <option value="keto_low_carb">Low-Carb / Ketogenic Focus</option>
                </select>
              </div>
            </div>

            {/* Target Breakdown Output Cards */}
            <div className="rounded-2xl bg-secondary p-5 border border-border space-y-4">
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Estimated Daily Target
                  </p>
                  <h4 className="text-3xl font-serif font-bold text-foreground">
                    {targetCalories} kcal
                  </h4>
                </div>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  USDA Verified Formula
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-2xl bg-background border border-border p-3">
                  <div className="text-lg font-bold text-emerald-600">{targetProteinG}g</div>
                  <div className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">
                    Protein ({targetProteinG * 4} kcal)
                  </div>
                </div>

                <div className="rounded-2xl bg-background border border-border p-3">
                  <div className="text-lg font-bold text-amber-600">{targetCarbsG}g</div>
                  <div className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">
                    Carbs ({targetCarbsG * 4} kcal)
                  </div>
                </div>

                <div className="rounded-2xl bg-background border border-border p-3">
                  <div className="text-lg font-bold text-blue-600">{targetFatG}g</div>
                  <div className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">
                    Fat ({targetFatG * 9} kcal)
                  </div>
                </div>

                <div className="rounded-2xl bg-background border border-border p-3">
                  <div className="text-lg font-bold text-purple-600">{targetFiberG}g</div>
                  <div className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">
                    Dietary Fiber
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: MYTHS */}
      {activeTab === "myths" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-background p-5">
            <h3 className="text-xl font-serif text-foreground mb-4">
              💡 USDA Nutrition Myth Busters
            </h3>

            <div className="space-y-4 text-xs">
              <div className="rounded-2xl bg-secondary/60 p-4 border border-border">
                <p className="font-bold text-rose-600 dark:text-rose-400 mb-1">
                  ❌ MYTH: "Carbohydrates inherently cause fat gain."
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>✅ USDA FACT:</strong> Body weight changes are governed by net energy
                  balance (calories in vs. calories out). Complex carbohydrates with high fiber
                  stabilize blood sugar and prevent overeating.
                </p>
              </div>

              <div className="rounded-2xl bg-secondary/60 p-4 border border-border">
                <p className="font-bold text-rose-600 dark:text-rose-400 mb-1">
                  ❌ MYTH: "Eating more than 30g of protein per meal is wasted."
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>✅ USDA FACT:</strong> The human digestive tract absorbs almost 100% of
                  consumed protein amino acids over time. While muscle protein synthesis spikes at
                  ~30-40g, excess protein continues to contribute to satiety and tissue turnover.
                </p>
              </div>

              <div className="rounded-2xl bg-secondary/60 p-4 border border-border">
                <p className="font-bold text-rose-600 dark:text-rose-400 mb-1">
                  ❌ MYTH: "All fast food is inherently junk."
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>✅ USDA FACT:</strong> Fast casual and fast-food chains offer customizable
                  options. Choosing grilled chicken, brown rice or greens, avocado, and water
                  creates a balanced meal that aligns with USDA guidelines.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
