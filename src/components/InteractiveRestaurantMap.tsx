import { useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { type NearbyPlace } from "@/lib/nearby.functions";

type Coords = { lat: number; lng: number; label?: string };

interface InteractiveRestaurantMapProps {
  apiKey: string;
  userCoords: Coords;
  places: NearbyPlace[];
  selectedPlace: NearbyPlace | null;
  onSelectPlace: (p: NearbyPlace | null) => void;
  onViewMenu?: (p: NearbyPlace) => void;
  favoriteChains?: string[];
}

function MapController({
  userCoords,
  places,
  selectedPlace,
  showRoute,
}: {
  userCoords: Coords;
  places: NearbyPlace[];
  selectedPlace: NearbyPlace | null;
  showRoute: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (typeof google === "undefined" || !google.maps) return;

    if (showRoute && selectedPlace) {
      return;
    }
    if (selectedPlace) {
      map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
      map.setZoom(15);
    } else if (places.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: userCoords.lat, lng: userCoords.lng });
      places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    } else {
      map.panTo({ lat: userCoords.lat, lng: userCoords.lng });
      map.setZoom(13);
    }
  }, [map, userCoords, places, selectedPlace, showRoute]);

  return null;
}

function RoutePolyline({
  origin,
  destination,
  travelMode,
  onRouteComputed,
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  travelMode: "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";
  onRouteComputed: (info: { distance: string; duration: string } | null) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: travelMode as unknown as google.maps.TravelMode,
      fields: ["path", "distanceMeters", "durationMillis", "viewport"],
    })
      .then(({ routes }) => {
        if (routes && routes[0]) {
          const route = routes[0];
          const newPolylines = route.createPolylines({
            polylineOptions: {
              strokeColor: "#E0533C",
              strokeWeight: 6,
              strokeOpacity: 0.9,
            },
          });
          newPolylines.forEach((p) => p.setMap(map));
          polylinesRef.current = newPolylines;

          if (route.viewport) {
            map.fitBounds(route.viewport, { top: 60, bottom: 60, left: 60, right: 60 });
          }

          const distMiles = (route.distanceMeters / 1609.34).toFixed(1);
          const durationMins = Math.round(route.durationMillis / 60000);
          onRouteComputed({
            distance: `${distMiles} mi`,
            duration: durationMins < 1 ? "< 1 min" : `${durationMins} min`,
          });
        }
      })
      .catch((err) => {
        console.warn("Routes API computeRoutes failed, falling back:", err);
        onRouteComputed(null);
      });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng, travelMode]);

  return null;
}

export function InteractiveRestaurantMap({
  apiKey,
  userCoords,
  places,
  selectedPlace,
  onSelectPlace,
  onViewMenu,
  favoriteChains = [],
}: InteractiveRestaurantMapProps) {
  const [travelMode, setTravelMode] = useState<"DRIVING" | "WALKING">("DRIVING");
  const [showRoute, setShowRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  const mapApiKey =
    apiKey ||
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as unknown as { env?: { VITE_GOOGLE_MAPS_PLATFORM_KEY?: string } }).env
      ?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    "";
  const hasValidKey = Boolean(mapApiKey) && mapApiKey !== "YOUR_API_KEY";

  // Clear route when place changes or is deselected
  useEffect(() => {
    if (!selectedPlace) {
      setShowRoute(false);
      setRouteInfo(null);
    }
  }, [selectedPlace]);

  const googleMapsDirectionsUrl = selectedPlace
    ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${selectedPlace.lat},${selectedPlace.lng}&travelmode=${travelMode.toLowerCase()}`
    : "#";

  const googleMapsSearchUrl = selectedPlace
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.chain + " " + selectedPlace.address)}`
    : "#";

  // Fallback Radar Map when live Google Maps JS SDK key is not active
  if (!hasValidKey) {
    return (
      <div className="relative w-full rounded-3xl overflow-hidden border border-border shadow-md bg-card mb-6">
        <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🗺️</span>
            <div>
              <h3 className="text-sm font-bold font-serif text-foreground">
                Nearby Restaurants Proximity Map
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Showing spots near {userCoords.label || "your location"} • Filtered by profile
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {places.length} Spots Nearby
          </span>
        </div>

        {/* Visual Map Grid Radar */}
        <div className="relative w-full h-[320px] bg-emerald-950/5 dark:bg-emerald-950/20 p-4 flex flex-col justify-between overflow-hidden">
          {/* Subtle Radar grid lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#2E6F40_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-primary/20 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-primary/15 pointer-events-none" />

          {/* User Center Pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white" />
            </span>
            <span className="text-[10px] font-bold bg-background/90 text-foreground px-2 py-0.5 rounded-full border border-border mt-1 shadow-sm">
              You
            </span>
          </div>

          {/* Nearby Restaurant Pins on Visual Map */}
          <div className="relative w-full h-full z-10">
            {places.map((p, idx) => {
              const isFav = favoriteChains.includes(p.chain);
              const isSelected = selectedPlace?.id === p.id;

              // Scatter pins visually around center based on index & distance
              const angle = (idx * (360 / Math.min(places.length, 10)) * Math.PI) / 180;
              const radius = Math.min(130, Math.max(35, (p.distanceMeters / 2500) * 120));
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPlace(p)}
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  }}
                  className={
                    "absolute top-1/2 left-1/2 transition-all duration-300 rounded-full flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold shadow-md cursor-pointer border " +
                    (isSelected
                      ? "bg-tomato text-white border-white ring-4 ring-tomato/30 z-30 scale-110"
                      : isFav
                        ? "bg-primary text-primary-foreground border-primary/40 z-20 hover:scale-105"
                        : "bg-card text-foreground border-border hover:border-primary z-10 hover:scale-105")
                  }
                >
                  <span>{isFav ? "⭐" : "📍"}</span>
                  <span className="truncate max-w-[90px] sm:max-w-[120px]">{p.chain}</span>
                  <span className="text-[9px] opacity-80">
                    {(p.distanceMeters / 1609.34).toFixed(1)}m
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Restaurant Information Card with direct Google Maps Links */}
        <div className="p-4 bg-card border-t border-border">
          {selectedPlace ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold font-serif text-foreground">
                      {selectedPlace.chain}
                    </h4>
                    {favoriteChains.includes(selectedPlace.chain) && (
                      <span className="text-[10px] uppercase font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                        ❤️ Profile Favorite
                      </span>
                    )}
                    <span className="text-[10px] font-semibold bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
                      {(selectedPlace.distanceMeters / 1609.34).toFixed(1)} miles away
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{selectedPlace.address}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <a
                  href={googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-sm flex items-center gap-1.5"
                >
                  🧭 Get Directions on Google Maps ↗
                </a>

                <a
                  href={googleMapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-muted text-foreground hover:bg-muted/80 px-3.5 py-2 text-xs font-semibold border border-border transition flex items-center gap-1.5"
                >
                  📍 Open Location in Google Maps ↗
                </a>

                {onViewMenu && (
                  <button
                    type="button"
                    onClick={() => onViewMenu(selectedPlace)}
                    className="rounded-full bg-leaf text-background px-4 py-2 text-xs font-bold hover:opacity-90 transition active:scale-95 flex items-center gap-1.5"
                  >
                    🥗 View Healthy Options
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-muted-foreground text-xs">
              💡 Tap any restaurant pin on the map above to view location details & Google Maps
              directions.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-border shadow-md bg-card mb-6">
      <APIProvider apiKey={mapApiKey} version="weekly">
        <div className="w-full h-[380px] sm:h-[440px] relative">
          <Map
            defaultCenter={{ lat: userCoords.lat, lng: userCoords.lng }}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            style={{ width: "100%", height: "100%" }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <MapController
              userCoords={userCoords}
              places={places}
              selectedPlace={selectedPlace}
              showRoute={showRoute}
            />

            {/* User Position Marker */}
            <AdvancedMarker
              position={{ lat: userCoords.lat, lng: userCoords.lng }}
              title="You are here"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute h-8 w-8 rounded-full bg-blue-500/30 animate-ping" />
                <div className="h-5 w-5 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-white">
                  📍
                </div>
              </div>
            </AdvancedMarker>

            {/* Restaurant Markers */}
            {places.map((p) => {
              const isSelected = selectedPlace?.id === p.id;
              return (
                <AdvancedMarker
                  key={p.id}
                  position={{ lat: p.lat, lng: p.lng }}
                  title={p.chain}
                  onClick={() => {
                    onSelectPlace(p);
                    setShowRoute(true);
                  }}
                >
                  <div
                    className={
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs shadow-lg border transition-transform cursor-pointer " +
                      (isSelected
                        ? "bg-[#E0533C] text-white border-white ring-2 ring-[#E0533C]/50 scale-110 z-30"
                        : "bg-[#2E6F40] text-white border-white/80 hover:scale-105 z-10")
                    }
                  >
                    <span>📍</span>
                    <span className="truncate max-w-[100px]">{p.chain}</span>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for Selected Restaurant */}
            {selectedPlace && (
              <InfoWindow
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                onCloseClick={() => {
                  onSelectPlace(null);
                  setShowRoute(false);
                }}
              >
                <div className="p-1 max-w-[240px] font-sans text-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">{selectedPlace.chain}</span>
                    <span className="text-[10px] font-semibold bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
                      {(selectedPlace.distanceMeters / 1609.34).toFixed(1)} mi
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {selectedPlace.address}
                  </p>

                  <div className="mt-3 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setShowRoute(true)}
                      className="w-full rounded-full bg-primary text-primary-foreground py-1.5 px-3 text-xs font-semibold hover:opacity-90 transition flex items-center justify-center gap-1"
                    >
                      🗺️ Draw Directions on Map
                    </button>

                    <a
                      href={googleMapsDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full rounded-full bg-muted text-foreground hover:bg-muted/80 py-1.5 px-3 text-xs font-medium transition flex items-center justify-center gap-1 border border-border"
                    >
                      ↗ Open Google Maps App
                    </a>

                    {onViewMenu && (
                      <button
                        type="button"
                        onClick={() => onViewMenu(selectedPlace)}
                        className="w-full rounded-full bg-leaf text-background py-1.5 px-3 text-xs font-bold hover:opacity-90 transition flex items-center justify-center gap-1"
                      >
                        🥗 View Healthy Options
                      </button>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* Route Polyline renderer */}
            {showRoute && selectedPlace && (
              <RoutePolyline
                origin={{ lat: userCoords.lat, lng: userCoords.lng }}
                destination={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                travelMode={travelMode}
                onRouteComputed={setRouteInfo}
              />
            )}
          </Map>

          {/* Map Overlay Controls / Info Banner */}
          <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex flex-wrap items-center justify-between gap-2">
            <div className="pointer-events-auto bg-background/90 backdrop-blur border border-border rounded-full px-3 py-1.5 shadow-md text-xs font-medium flex items-center gap-2">
              <span className="text-sage font-bold">📍 {places.length} Spots Nearby</span>
            </div>

            {selectedPlace && (
              <div className="pointer-events-auto bg-background/95 backdrop-blur border border-border rounded-full p-1 shadow-lg flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTravelMode("DRIVING")}
                  className={
                    "px-2.5 py-1 rounded-full text-[11px] font-bold transition " +
                    (travelMode === "DRIVING"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  🚗 Drive
                </button>
                <button
                  type="button"
                  onClick={() => setTravelMode("WALKING")}
                  className={
                    "px-2.5 py-1 rounded-full text-[11px] font-bold transition " +
                    (travelMode === "WALKING"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  🚶 Walk
                </button>
              </div>
            )}
          </div>

          {/* Active Route Bottom Bar */}
          {showRoute && selectedPlace && (
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-background/95 backdrop-blur border border-border p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-sm text-foreground truncate">
                    Directions to {selectedPlace.chain}
                  </span>
                  <span className="text-[10px] bg-tomato/20 text-tomato px-2 py-0.5 rounded-full font-semibold uppercase">
                    {travelMode === "DRIVING" ? "Driving" : "Walking"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {routeInfo
                    ? `⏱️ ${routeInfo.duration} (${routeInfo.distance})`
                    : "Calculating route on Google Maps..."}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold hover:opacity-90 transition shadow-sm active:scale-95 flex items-center gap-1"
                >
                  🧭 Start GPS ↗
                </a>
              </div>
            </div>
          )}
        </div>
      </APIProvider>
    </div>
  );
}
