// Sample menu images (base64 SVG data URIs) allowing users to test AI Scanning instantly

function svgToBase64(svg: string): string {
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(svg)));
  }
  return Buffer.from(svg).toString("base64");
}

export interface SampleMenu {
  id: string;
  name: string;
  category: string;
  description: string;
  base64Data: string;
  mimeType: string;
}

const DELI_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" style="background-color:#fefcf6; font-family:sans-serif;">
  <rect x="20" y="20" width="760" height="960" rx="16" fill="#fffdfa" stroke="#222" stroke-width="4"/>
  <rect x="30" y="30" width="740" height="940" fill="none" stroke="#e0d6c3" stroke-width="2"/>
  
  <text x="400" y="80" text-anchor="middle" font-size="34" font-family="serif" font-weight="bold" fill="#111">GREENWICH VILLAGE DELI &amp; GRILL</text>
  <text x="400" y="110" text-anchor="middle" font-size="14" fill="#666">Fresh Gourmet Sandwiches, Salads, &amp; Hot Dishes • NYC</text>
  <line x1="80" y1="130" x2="720" y2="130" stroke="#111" stroke-width="2"/>

  <!-- Section 1 -->
  <text x="80" y="175" font-size="22" font-weight="bold" fill="#2d5a27">SIGNATURE SANDWICHES &amp; WRAPS</text>
  
  <text x="80" y="215" font-size="18" font-weight="bold" fill="#111">1. Turkey Avocado &amp; Spinach Wrap</text>
  <text x="720" y="215" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$11.50</text>
  <text x="100" y="240" font-size="14" fill="#555">Oven-roasted turkey breast, fresh avocado, baby spinach, cucumber, tomatoes, &amp; light mayo in a spinach tortilla.</text>

  <text x="80" y="285" font-size="18" font-weight="bold" fill="#111">2. Classic Pastrami on Rye</text>
  <text x="720" y="285" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$14.95</text>
  <text x="100" y="310" font-size="14" fill="#555">Warm hot pastrami, spicy brown mustard, &amp; kosher dill pickles on toasted seedable rye bread.</text>

  <text x="80" y="355" font-size="18" font-weight="bold" fill="#111">3. Grilled Chicken Pesto Panini</text>
  <text x="720" y="355" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$12.95</text>
  <text x="100" y="380" font-size="14" fill="#555">Grilled chicken cutlet, basil pesto, fresh mozzarella, roasted red peppers, &amp; balsamic glaze on ciabatta.</text>

  <text x="80" y="425" font-size="18" font-weight="bold" fill="#111">4. Loaded Triple Cheese Melt</text>
  <text x="720" y="425" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$9.95</text>
  <text x="100" y="450" font-size="14" fill="#555">Melted cheddar, provolone, swiss cheese, double butter spread, &amp; thick cut sourdough bread.</text>

  <!-- Section 2 -->
  <line x1="80" y1="485" x2="720" y2="485" stroke="#e0e0e0" stroke-width="1"/>
  <text x="80" y="525" font-size="22" font-weight="bold" fill="#2d5a27">FRESH SALADS &amp; GRAIN BOWLS</text>

  <text x="80" y="565" font-size="18" font-weight="bold" fill="#111">5. Mediterranean Quinoa Power Bowl</text>
  <text x="720" y="565" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$13.50</text>
  <text x="100" y="590" font-size="14" fill="#555">Organic quinoa, cucumbers, cherry tomatoes, kalamata olives, chickpeas, feta, &amp; lemon oregano vinaigrette.</text>

  <text x="80" y="635" font-size="18" font-weight="bold" fill="#111">6. Crispy Chicken Cobb Salad</text>
  <text x="720" y="635" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$14.50</text>
  <text x="100" y="660" font-size="14" fill="#555">Fried chicken tender strips, smoked bacon bits, hardboiled egg, blue cheese crumble, &amp; creamy ranch.</text>

  <!-- Section 3 -->
  <line x1="80" y1="695" x2="720" y2="695" stroke="#e0e0e0" stroke-width="1"/>
  <text x="80" y="735" font-size="22" font-weight="bold" fill="#2d5a27">HOT GRILL &amp; BREAKFAST ALL DAY</text>

  <text x="80" y="775" font-size="18" font-weight="bold" fill="#111">7. Egg White &amp; Spinach Omelet</text>
  <text x="720" y="775" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$10.25</text>
  <text x="100" y="800" font-size="14" fill="#555">4 egg whites, wilted spinach, diced tomatoes, low-sodium feta, served with whole wheat toast.</text>

  <text x="80" y="845" font-size="18" font-weight="bold" fill="#111">8. Bacon Cheeseburger &amp; Fries</text>
  <text x="720" y="845" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$15.00</text>
  <text x="100" y="870" font-size="14" fill="#555">8oz angus beef patty, crispy bacon, American cheese, special sauce, &amp; seasoned french fries.</text>

  <text x="400" y="930" text-anchor="middle" font-size="12" fill="#888">* Calories &amp; nutrition available upon request. All items prepared fresh daily.</text>
</svg>`;

const MEXICAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" style="background-color:#faf6ee; font-family:sans-serif;">
  <rect x="20" y="20" width="760" height="960" rx="16" fill="#fffdfa" stroke="#d97724" stroke-width="4"/>
  <text x="400" y="80" text-anchor="middle" font-size="34" font-family="serif" font-weight="bold" fill="#b43403">TAQUERIA EL SOL - AUTHENTIC MEXICAN</text>
  <text x="400" y="110" text-anchor="middle" font-size="14" fill="#777">Fresh Handmade Tortillas &amp; Wood-Fired Meats</text>
  <line x1="80" y1="130" x2="720" y2="130" stroke="#b43403" stroke-width="2"/>

  <text x="80" y="180" font-size="22" font-weight="bold" fill="#b43403">TACOS &amp; SPECIALTIES</text>

  <text x="80" y="220" font-size="18" font-weight="bold" fill="#111">1. Grilled Mahi-Mahi Fish Tacos (3 pcs)</text>
  <text x="720" y="220" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$13.95</text>
  <text x="100" y="245" font-size="14" fill="#555">Seasoned grilled wild mahi-mahi, purple cabbage slaw, pico de gallo, &amp; lime avocado crema on corn tortillas.</text>

  <text x="80" y="290" font-size="18" font-weight="bold" fill="#111">2. Flame-Grilled Chicken Burrito Bowl</text>
  <text x="720" y="290" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$12.50</text>
  <text x="100" y="315" font-size="14" fill="#555">Citrus marinated grilled chicken, brown rice, black beans, grilled peppers, onions, &amp; fresh salsa verde.</text>

  <text x="80" y="360" font-size="18" font-weight="bold" fill="#111">3. Monster Carne Asada Burrito</text>
  <text x="720" y="360" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$14.50</text>
  <text x="100" y="385" font-size="14" fill="#555">Grilled steak, Mexican rice, refried beans, melted cheese, sour cream, guacamole in a giant flour tortilla.</text>

  <text x="80" y="430" font-size="18" font-weight="bold" fill="#111">4. Veggie Fiesta Fajita Plate</text>
  <text x="720" y="430" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$13.00</text>
  <text x="100" y="455" font-size="14" fill="#555">Sautéed bell peppers, zucchini, onions, pinto beans, guacamole, with 3 warm corn tortillas.</text>

  <text x="80" y="500" font-size="18" font-weight="bold" fill="#111">5. Cheesy Chorizo Quesadilla</text>
  <text x="720" y="500" text-anchor="end" font-size="18" font-weight="bold" fill="#111">$11.95</text>
  <text x="100" y="525" font-size="14" fill="#555">Spicy Mexican chorizo sausage, oaxaca cheese, toasted flour tortilla, served with pico &amp; sour cream.</text>
</svg>`;

export const SAMPLE_MENUS: SampleMenu[] = [
  {
    id: "sample_deli",
    name: "Greenwich Village Deli",
    category: "Deli & Grill",
    description: "Sample NYC Deli paper menu with turkey wrap, omelets, pastrami, & bowls.",
    base64Data: svgToBase64(DELI_SVG),
    mimeType: "image/svg+xml",
  },
  {
    id: "sample_taqueria",
    name: "Taqueria El Sol",
    category: "Mexican Restaurant",
    description: "Sample Mexican menu with fish tacos, chicken bowls, & fajitas.",
    base64Data: svgToBase64(MEXICAN_SVG),
    mimeType: "image/svg+xml",
  },
];
