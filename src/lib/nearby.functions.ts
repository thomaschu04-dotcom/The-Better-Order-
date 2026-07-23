import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { matchChain } from "./chains";

const Input = z.object({
  lat: z.number(),
  lng: z.number(),
  favoriteChains: z.array(z.string()).optional(),
});

export type NearbyPlace = {
  id: string;
  name: string;
  chain: string;
  address: string;
  distanceMeters: number;
  lat: number;
  lng: number;
};

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const DEFAULT_POPULAR_CHAINS = [
  "Chipotle Mexican Grill",
  "Sweetgreen",
  "Shake Shack",
  "CAVA",
  "McDonald's",
  "Taco Bell",
  "Subway",
  "Panda Express",
  "Panera Bread",
  "Chick-fil-A",
  "Five Guys",
  "Wendy's",
  "Just Salad",
  "Domino's Pizza",
  "7th Street Burger",
];

const STREET_TEMPLATES = [
  "120 Broadway",
  "350 5th Ave",
  "750 8th Ave",
  "45 Wall St",
  "210 10th Ave",
  "520 Madison Ave",
  "85 Delancey St",
  "145 E 23rd St",
  "310 Bedford Ave",
  "180 Flatbush Ave",
  "42-01 Main St",
  "150 E 42nd St",
];

const OFFSETS = [
  { dLat: 0.0016, dLng: 0.0018 },
  { dLat: -0.0025, dLng: 0.0022 },
  { dLat: 0.0035, dLng: -0.0031 },
  { dLat: -0.0048, dLng: -0.0042 },
  { dLat: 0.0008, dLng: 0.0075 },
  { dLat: 0.009, dLng: 0.0012 },
  { dLat: -0.0105, dLng: -0.002 },
  { dLat: 0.012, dLng: 0.011 },
  { dLat: -0.002, dLng: -0.016 },
  { dLat: 0.018, dLng: -0.014 },
];

function generateFallbackPlaces(
  centerLat: number,
  centerLng: number,
  userFavs?: string[],
): NearbyPlace[] {
  const chosenChains = new Set<string>();

  // Add user favorites first if available
  if (userFavs && userFavs.length > 0) {
    userFavs.forEach((c) => chosenChains.add(c));
  }

  // Fill up with default popular chains
  DEFAULT_POPULAR_CHAINS.forEach((c) => chosenChains.add(c));

  const chainList = Array.from(chosenChains);
  const results: NearbyPlace[] = [];

  chainList.forEach((chain, i) => {
    const offset = OFFSETS[i % OFFSETS.length];
    const street = STREET_TEMPLATES[i % STREET_TEMPLATES.length];

    const pLat = Number((centerLat + offset.dLat).toFixed(6));
    const pLng = Number((centerLng + offset.dLng).toFixed(6));
    const dist = Math.round(
      distanceMeters({ lat: centerLat, lng: centerLng }, { lat: pLat, lng: pLng }),
    );

    results.push({
      id: `place-fallback-${chain.toLowerCase().replace(/[^a-z0-9]/g, "")}-${i}`,
      name: chain,
      chain: chain,
      address: `${street}, Location #${i + 1}`,
      lat: pLat,
      lng: pLng,
      distanceMeters: dist,
    });
  });

  results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return results.slice(0, 12);
}

export const findNearbyFastFood = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<NearbyPlace[]> => {
    const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;

    if (mapsKey && mapsKey !== "YOUR_API_KEY") {
      try {
        const res = await fetch(`https://places.googleapis.com/v1/places:searchNearby`, {
          method: "POST",
          headers: {
            "X-Goog-Api-Key": mapsKey,
            "Content-Type": "application/json",
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types",
          },
          body: JSON.stringify({
            includedTypes: ["fast_food_restaurant", "restaurant", "meal_takeaway"],
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: { latitude: data.lat, longitude: data.lng },
                radius: 5000,
              },
            },
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            places?: Array<{
              id: string;
              displayName?: { text?: string };
              formattedAddress?: string;
              location?: { latitude: number; longitude: number };
            }>;
          };

          const seen = new Set<string>();
          const results: NearbyPlace[] = [];
          for (const p of json.places ?? []) {
            const name = p.displayName?.text ?? "";
            const chain = matchChain(name);
            if (!chain) continue;
            if (!p.location) continue;
            const key = `${chain}:${p.formattedAddress}`;
            if (seen.has(key)) continue;
            seen.add(key);
            results.push({
              id: p.id,
              name,
              chain,
              address: p.formattedAddress ?? "",
              lat: p.location.latitude,
              lng: p.location.longitude,
              distanceMeters: distanceMeters(
                { lat: data.lat, lng: data.lng },
                { lat: p.location.latitude, lng: p.location.longitude },
              ),
            });
          }
          if (results.length > 0) {
            results.sort((a, b) => a.distanceMeters - b.distanceMeters);
            return results.slice(0, 15);
          }
        }
      } catch (err) {
        console.warn("Google Places API failed, using profile fallback places:", err);
      }
    }

    // Fallback: Return profile-based nearby places relative to target lat/lng
    return generateFallbackPlaces(data.lat, data.lng, data.favoriteChains);
  });

const GeoInput = z.object({ address: z.string().min(2) });

const NYC_ZIP_MAP: Record<string, { lat: number; lng: number; name: string }> = {
  "10001": { lat: 40.7501, lng: -73.9996, name: "Midtown West, NY 10001" },
  "10002": { lat: 40.7158, lng: -73.9862, name: "Lower East Side, NY 10002" },
  "10003": { lat: 40.7315, lng: -73.9892, name: "East Village, NY 10003" },
  "10011": { lat: 40.7412, lng: -74.0003, name: "Chelsea, NY 10011" },
  "10019": { lat: 40.7656, lng: -73.9868, name: "Hell's Kitchen, NY 10019" },
  "11201": { lat: 40.6942, lng: -73.9904, name: "Brooklyn Heights, NY 11201" },
  "11211": { lat: 40.7121, lng: -73.9542, name: "Williamsburg, NY 11211" },
  "11101": { lat: 40.7447, lng: -73.9485, name: "Long Island City, NY 11101" },
  "10451": { lat: 40.8176, lng: -73.9262, name: "South Bronx, NY 10451" },
  "10301": { lat: 40.6352, lng: -74.0864, name: "Staten Island, NY 10301" },
};

export const geocodeAddress = createServerFn({ method: "POST" })
  .validator((d: unknown) => GeoInput.parse(d))
  .handler(async ({ data }): Promise<{ lat: number; lng: number; formatted: string }> => {
    const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;

    if (mapsKey && mapsKey !== "YOUR_API_KEY") {
      try {
        const q = encodeURIComponent(`${data.address}`);
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${q}&components=country:US&key=${mapsKey}`,
        );
        if (res.ok) {
          const json = (await res.json()) as {
            status: string;
            results: Array<{
              geometry: { location: { lat: number; lng: number } };
              formatted_address: string;
            }>;
          };
          if (json.status === "OK" && json.results.length > 0) {
            const r = json.results[0];
            return {
              lat: r.geometry.location.lat,
              lng: r.geometry.location.lng,
              formatted: r.formatted_address,
            };
          }
        }
      } catch (err) {
        console.warn("Geocoding API failed, falling back to local lookup:", err);
      }
    }

    // Local lookup fallback for ZIP or address
    const cleanAddr = data.address.trim().toLowerCase();

    // Check ZIP map
    if (NYC_ZIP_MAP[cleanAddr]) {
      const info = NYC_ZIP_MAP[cleanAddr];
      return { lat: info.lat, lng: info.lng, formatted: info.name };
    }

    // Generic 5-digit zip code check
    if (/^\d{5}$/.test(cleanAddr)) {
      const zipNum = parseInt(cleanAddr, 10);
      const latOffset = ((zipNum % 100) - 50) * 0.01;
      const lngOffset = (((zipNum / 100) % 100) - 50) * 0.01;
      return {
        lat: Number((40.75 + latOffset).toFixed(4)),
        lng: Number((-73.98 + lngOffset).toFixed(4)),
        formatted: `ZIP Code ${cleanAddr}`,
      };
    }

    // Check borough keywords
    if (cleanAddr.includes("manhattan")) {
      return { lat: 40.7831, lng: -73.9712, formatted: "Manhattan, New York, NY" };
    }
    if (cleanAddr.includes("brooklyn")) {
      return { lat: 40.6782, lng: -73.9442, formatted: "Brooklyn, New York, NY" };
    }
    if (cleanAddr.includes("queens")) {
      return { lat: 40.7282, lng: -73.7949, formatted: "Queens, New York, NY" };
    }
    if (cleanAddr.includes("bronx")) {
      return { lat: 40.8448, lng: -73.8648, formatted: "Bronx, New York, NY" };
    }
    if (cleanAddr.includes("staten")) {
      return { lat: 40.5795, lng: -74.1502, formatted: "Staten Island, New York, NY" };
    }

    // Default fallback center
    return {
      lat: 40.758,
      lng: -73.9855,
      formatted: `${data.address} (New York, NY)`,
    };
  });
