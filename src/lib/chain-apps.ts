// Deep links to each chain's own ordering app / web-order page.
// iOS/Android open native app via universal link when installed; otherwise fall back to the web page.
export type ChainAppLink = {
  name: string;
  // Universal link that opens the chain's app on mobile if installed, else the web ordering site.
  url: string;
};

const APPS: Record<string, string> = {
  "McDonald's": "https://www.mcdonalds.com/us/en-us/mymcdonalds.html",
  "Burger King": "https://www.bk.com/menu",
  "Wendy's": "https://order.wendys.com/",
  "Five Guys": "https://order.fiveguys.com/",
  "Shake Shack": "https://shakeshack.com/order",
  "In-N-Out Burger": "https://www.in-n-out.com/",
  Whataburger: "https://order.whataburger.com/",
  "Chick-fil-A": "https://www.chick-fil-a.com/order",
  KFC: "https://www.kfc.com/order",
  Popeyes: "https://www.popeyes.com/order",
  "Raising Cane's": "https://www.raisingcanes.com/order",
  Bojangles: "https://www.bojangles.com/order",
  Wingstop: "https://www.wingstop.com/order",
  Jollibee: "https://www.jollibeefoods.com/",
  "Domino's Pizza": "https://www.dominos.com/en/pages/order/",
  "Pizza Hut": "https://www.pizzahut.com/",
  "Papa John's": "https://www.papajohns.com/order",
  "Little Caesars": "https://littlecaesars.com/en-us/order/",
  "7th Street Burger": "https://www.7thstreetburger.com/",
  Subway: "https://order.subway.com/en-us",
  "Jimmy John's": "https://online.jimmyjohns.com/",
  "Jersey Mike's Subs": "https://www.jerseymikes.com/menu",
  "Firehouse Subs": "https://www.firehousesubs.com/menu/",
  "Potbelly Sandwich Shop": "https://www.potbelly.com/order",
  "Arby's": "https://order.arbys.com/",
  "Taco Bell": "https://www.tacobell.com/food",
  "Chipotle Mexican Grill": "https://www.chipotle.com/order",
  "Qdoba Mexican Eats": "https://www.qdoba.com/order",
  "Moe's Southwest Grill": "https://www.moes.com/order",
  "Panda Express": "https://www.pandaexpress.com/order",
  "Sarku Japan": "https://www.sarkujapan.com/",
  Sweetgreen: "https://order.sweetgreen.com/",
  "Just Salad": "https://www.justsalad.com/order",
  "Chopt Creative Salad": "https://www.choptsalad.com/order",
  CAVA: "https://cava.com/order",
  "Panera Bread": "https://www.panerabread.com/en-us/menu.html",
  Starbucks: "https://www.starbucks.com/menu",
  "Dunkin'": "https://www.dunkindonuts.com/en/mobile-app",
  "Tim Hortons": "https://www.timhortons.com/menu",
};

export function chainAppLink(chain: string): ChainAppLink {
  const url =
    APPS[chain] ?? `https://www.google.com/search?q=${encodeURIComponent(chain + " order")}`;
  return { name: chain, url };
}
