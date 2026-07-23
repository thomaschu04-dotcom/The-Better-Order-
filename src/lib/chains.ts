// Well-known fast food / fast-casual chains. Match against Google Places names case-insensitively.
export const KNOWN_CHAINS = [
  // Burgers
  { name: "McDonald's", match: ["mcdonalds"] },
  { name: "Burger King", match: ["burgerking"] },
  { name: "Wendy's", match: ["wendys"] },
  { name: "Five Guys", match: ["fiveguys"] },
  { name: "Shake Shack", match: ["shakeshack"] },
  { name: "In-N-Out Burger", match: ["innoutburger", "innout"] },
  { name: "Whataburger", match: ["whataburger"] },
  { name: "Carl's Jr.", match: ["carlsjr"] },
  { name: "Hardee's", match: ["hardees"] },
  { name: "Jack in the Box", match: ["jackinthebox"] },
  { name: "White Castle", match: ["whitecastle"] },
  { name: "Sonic Drive-In", match: ["sonicdrivein", "sonic"] },
  { name: "Culver's", match: ["culvers"] },
  { name: "Steak 'n Shake", match: ["steaknshake"] },
  { name: "Smashburger", match: ["smashburger"] },
  { name: "BurgerFi", match: ["burgerfi"] },
  { name: "Fatburger", match: ["fatburger"] },
  { name: "Checkers", match: ["checkers"] },
  { name: "Rally's", match: ["rallys"] },
  { name: "Krystal", match: ["krystal"] },

  // Chicken
  { name: "Chick-fil-A", match: ["chickfila"] },
  { name: "KFC", match: ["kfc", "kentuckyfriedchicken"] },
  { name: "Popeyes", match: ["popeyes"] },
  { name: "Raising Cane's", match: ["raisingcanes"] },
  { name: "Bojangles", match: ["bojangles"] },
  { name: "Church's Chicken", match: ["churchschicken", "churchstexaschicken"] },
  { name: "Zaxby's", match: ["zaxbys"] },
  { name: "Wingstop", match: ["wingstop"] },
  { name: "Buffalo Wild Wings", match: ["buffalowildwings", "bww"] },
  { name: "Wing Zone", match: ["wingzone"] },
  { name: "El Pollo Loco", match: ["elpolloloco"] },
  { name: "PDQ", match: ["pdq"] },
  { name: "Jollibee", match: ["jollibee"] },
  { name: "Nando's", match: ["nandos"] },

  // Pizza
  { name: "Domino's Pizza", match: ["dominos"] },
  { name: "Pizza Hut", match: ["pizzahut"] },
  { name: "Papa John's", match: ["papajohns"] },
  { name: "Little Caesars", match: ["littlecaesars"] },
  { name: "Papa Murphy's", match: ["papamurphys"] },
  { name: "Marco's Pizza", match: ["marcospizza"] },
  { name: "Blaze Pizza", match: ["blazepizza"] },
  { name: "MOD Pizza", match: ["modpizza"] },
  { name: "&Pizza", match: ["andpizza"] },
  { name: "Sbarro", match: ["sbarro"] },
  { name: "7th Street Burger", match: ["7thstreetburger", "seventhstreetburger"] },
  { name: "Sarku Japan", match: ["sarkujapan", "sarku"] },
  { name: "CAVA", match: ["cava"] },
  { name: "Round Table Pizza", match: ["roundtablepizza"] },

  // Sandwiches / Subs
  { name: "Subway", match: ["subway"] },
  { name: "Jimmy John's", match: ["jimmyjohns"] },
  { name: "Jersey Mike's Subs", match: ["jerseymikes"] },
  { name: "Firehouse Subs", match: ["firehousesubs"] },
  { name: "Quiznos", match: ["quiznos"] },
  { name: "Potbelly Sandwich Shop", match: ["potbelly"] },
  { name: "Which Wich", match: ["whichwich"] },
  { name: "Arby's", match: ["arbys"] },
  { name: "Charleys Cheesesteaks", match: ["charleys", "charleyscheesesteaks"] },
  { name: "Pret A Manger", match: ["pretamanger"] },

  // Mexican
  { name: "Taco Bell", match: ["tacobell"] },
  { name: "Chipotle Mexican Grill", match: ["chipotle"] },
  { name: "Qdoba Mexican Eats", match: ["qdoba"] },
  { name: "Moe's Southwest Grill", match: ["moessouthwestgrill", "moes"] },
  { name: "Del Taco", match: ["deltaco"] },
  { name: "Taco John's", match: ["tacojohns"] },
  { name: "Baja Fresh", match: ["bajafresh"] },
  { name: "Rubio's Coastal Grill", match: ["rubios"] },
  { name: "Fuzzy's Taco Shop", match: ["fuzzystacoshop"] },
  { name: "On The Border", match: ["ontheborder"] },

  // Asian
  { name: "Panda Express", match: ["pandaexpress"] },
  { name: "P.F. Chang's", match: ["pfchangs"] },
  { name: "Pei Wei", match: ["peiwei"] },
  { name: "Sarku Japan", match: ["sarkujapan"] },
  { name: "Teriyaki Madness", match: ["teriyakimadness"] },
  { name: "Waba Grill", match: ["wabagrill"] },

  // Salads / Bowls / Healthy
  { name: "Sweetgreen", match: ["sweetgreen"] },
  { name: "Cava", match: ["cava"] },
  { name: "Just Salad", match: ["justsalad"] },
  { name: "Chopt Creative Salad", match: ["chopt"] },
  { name: "Salata", match: ["salata"] },
  { name: "Freshii", match: ["freshii"] },
  { name: "Tender Greens", match: ["tendergreens"] },

  // Bakery / Cafe
  { name: "Panera Bread", match: ["panerabread", "panera"] },
  { name: "Au Bon Pain", match: ["aubonpain"] },
  { name: "Corner Bakery Cafe", match: ["cornerbakery"] },
  { name: "Le Pain Quotidien", match: ["lepainquotidien"] },

  // Coffee / Donuts
  { name: "Starbucks", match: ["starbucks"] },
  { name: "Dunkin'", match: ["dunkin", "dunkindonuts"] },
  { name: "Tim Hortons", match: ["timhortons"] },
  { name: "Krispy Kreme", match: ["krispykreme"] },
  { name: "Peet's Coffee", match: ["peetscoffee"] },
  { name: "Caribou Coffee", match: ["cariboucoffee"] },
  { name: "Dutch Bros Coffee", match: ["dutchbros"] },
  { name: "Blue Bottle Coffee", match: ["bluebottle"] },

  // Ice cream / Frozen
  { name: "Dairy Queen", match: ["dairyqueen"] },
  { name: "Baskin-Robbins", match: ["baskinrobbins"] },
  { name: "Ben & Jerry's", match: ["benjerrys"] },
  { name: "Cold Stone Creamery", match: ["coldstonecreamery", "coldstone"] },
  { name: "Carvel", match: ["carvel"] },
  { name: "Menchie's", match: ["menchies"] },
  { name: "16 Handles", match: ["16handles"] },

  // Seafood / Other
  { name: "Long John Silver's", match: ["longjohnsilvers"] },
  { name: "Captain D's", match: ["captainds"] },
] as const;

export function matchChain(name: string): string | null {
  const normalized = name.toLowerCase().replace(/['’&\s-]/g, "");
  for (const chain of KNOWN_CHAINS) {
    for (const token of chain.match) {
      if (normalized.includes(token.toLowerCase().replace(/['’&\s-]/g, ""))) {
        return chain.name;
      }
    }
  }
  return null;
}

export const RESTRICTIONS = [
  { id: "high_protein", label: "High protein" },
  { id: "low_calorie", label: "Low calorie" },
  { id: "high_calorie", label: "High calorie" },
  { id: "low_carb", label: "Low carb" },
  { id: "high_carb", label: "High carb" },
  { id: "low_fat", label: "Low fat" },
  { id: "high_fat", label: "High fat" },
  { id: "high_fiber", label: "High fiber" },
  { id: "multi_vitamin", label: "Multivitamin rich" },
  { id: "gluten_free", label: "Gluten free" },
  { id: "sugar_free", label: "Sugar free" },
  { id: "low_sodium", label: "Less sodium" },
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
] as const;

// USDA / FDA daily-value references used for on-item % bars.
export const USDA_DV = {
  sodium_mg: 2300,
  added_sugar_g: 50,
} as const;

export type RestrictionId = (typeof RESTRICTIONS)[number]["id"];

export const HEALTH_CONDITIONS = [
  {
    id: "high_blood_pressure",
    label: "High blood pressure",
    note: "low sodium, avoid processed meats",
  },
  { id: "high_cholesterol", label: "High cholesterol", note: "low saturated fat, no trans fats" },
  {
    id: "diabetes",
    label: "Diabetes",
    note: "low added sugar, low glycemic carbs, moderate portions",
  },
  {
    id: "heart_disease",
    label: "Heart disease",
    note: "low sodium, low saturated fat, high fiber",
  },
  {
    id: "kidney_disease",
    label: "Kidney disease",
    note: "low sodium, low potassium, controlled protein",
  },
  { id: "lactose_intolerant", label: "Lactose intolerance", note: "no dairy" },
  { id: "celiac", label: "Celiac / gluten intolerance", note: "strictly gluten free" },
  { id: "nut_allergy", label: "Nut allergy", note: "no tree nuts or peanuts" },
  { id: "pregnancy", label: "Pregnancy", note: "avoid raw fish, unpasteurized dairy, deli meats" },
  {
    id: "ibs",
    label: "IBS / sensitive stomach",
    note: "avoid high-FODMAP, spicy, or greasy items",
  },
  {
    id: "acid_reflux",
    label: "Acid reflux / GERD",
    note: "avoid spicy, fried, acidic, caffeinated",
  },
  { id: "gout", label: "Gout", note: "low purine, avoid organ meats and shellfish" },
] as const;

export type HealthConditionId = (typeof HEALTH_CONDITIONS)[number]["id"];

export const BUDGETS = [
  { id: "any", label: "Any budget" },
  { id: "tight", label: "Tight ($ — under $8/meal)" },
  { id: "moderate", label: "Moderate ($$ — $8–15/meal)" },
  { id: "generous", label: "Generous ($$$ — $15+/meal)" },
] as const;

export type BudgetId = (typeof BUDGETS)[number]["id"];

export type NycFavoriteGroup = { category: string; chains: string[] };

export const NYC_FAVORITES: NycFavoriteGroup[] = [
  {
    category: "Burgers",
    chains: [
      "Shake Shack",
      "Five Guys",
      "McDonald's",
      "Burger King",
      "Wendy's",
      "7th Street Burger",
    ],
  },
  {
    category: "Chicken",
    chains: [
      "Chick-fil-A",
      "Popeyes",
      "KFC",
      "Raising Cane's",
      "Wingstop",
      "Jollibee",
      "Bojangles",
    ],
  },
  {
    category: "Mexican & Tex-Mex",
    chains: ["Chipotle Mexican Grill", "Taco Bell", "Qdoba Mexican Eats", "Moe's Southwest Grill"],
  },
  {
    category: "Sandwiches",
    chains: [
      "Subway",
      "Jersey Mike's Subs",
      "Jimmy John's",
      "Potbelly Sandwich Shop",
      "Panera Bread",
    ],
  },
  { category: "Pizza", chains: ["Domino's Pizza", "Pizza Hut", "Papa John's", "Little Caesars"] },
  { category: "Asian Fast Food", chains: ["Panda Express", "Sarku Japan"] },
  { category: "Coffee & Breakfast", chains: ["Dunkin'", "Starbucks", "Tim Hortons"] },
  {
    category: "NYC Fast Casual",
    chains: ["Shake Shack", "Sweetgreen", "Just Salad", "Chopt Creative Salad", "CAVA"],
  },
];
