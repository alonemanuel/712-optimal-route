"use client";

import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import { useCallback, useState } from "react";
import type { Route } from "@/lib/algorithm/types";

const MAP_CENTER = { lat: 32.0853, lng: 34.7818 };
const MAP_ZOOM = 13;

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const containerStyle = { width: "100%", height: "100%" };

const POLYLINE_OPTIONS: google.maps.PolylineOptions = {
  strokeColor: "#2563eb",
  strokeOpacity: 0.9,
  strokeWeight: 4,
};

interface RouteMapProps {
  route: Route | null;
}

export default function RouteMap({ route }: RouteMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const [, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    if (route && route.stops.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      route.stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
      bounds.extend({ lat: route.endpoint.lat, lng: route.endpoint.lng });
      map.fitBounds(bounds, 60);
    }
  }, [route]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <p className="text-destructive text-sm">
          Failed to load Google Maps. Check your API key.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <p className="text-muted-foreground text-sm">Loading map...</p>
      </div>
    );
  }

  // Build polyline path: stops in order, then endpoint
  const polylinePath =
    route && route.stops.length > 0
      ? [
          ...route.stops.map((s) => ({ lat: s.lat, lng: s.lng })),
          { lat: route.endpoint.lat, lng: route.endpoint.lng },
        ]
      : [];

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        styles: MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      }}
    >
      {/* Route polyline */}
      {polylinePath.length > 1 && (
        <Polyline path={polylinePath} options={POLYLINE_OPTIONS} />
      )}

      {/* Stop markers with numbered labels */}
      {route?.stops.map((stop, i) => (
        <Marker
          key={`stop-${i}`}
          position={{ lat: stop.lat, lng: stop.lng }}
          label={{
            text: String(i + 1),
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: "12px",
          }}
          title={`${stop.label} (${stop.cluster_size} riders nearby)`}
        />
      ))}

      {/* Endpoint marker (La Guardia / highway on-ramp) */}
      {route && (
        <Marker
          key="endpoint"
          position={{ lat: route.endpoint.lat, lng: route.endpoint.lng }}
          label={{
            text: "E",
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: "12px",
          }}
          title="Endpoint: Highway on-ramp (La Guardia)"
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: "#dc2626",
            fillOpacity: 1,
            strokeColor: "#991b1b",
            strokeWeight: 2,
          }}
        />
      )}
    </GoogleMap>
  );
}
