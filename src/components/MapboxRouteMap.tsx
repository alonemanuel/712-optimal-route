"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Route } from "@/lib/algorithm/types";

const MAP_CENTER: [number, number] = [34.7818, 32.0853]; // [lng, lat] for Mapbox
const MAP_ZOOM = 13;

interface MapboxRouteMapProps {
  route: Route | null;
}

// Reusable popup HTML generator
function createStopPopupHTML(stopNumber: number, label: string, clusterSize: number): string {
  return `
    <div class="bg-white rounded-lg shadow-lg p-4 min-w-64 animate-in fade-in zoom-in-95 duration-200">
      <div class="flex items-start justify-between mb-3">
        <div>
          <div class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mb-2">
            ${stopNumber}
          </div>
          <h3 class="font-semibold text-slate-900 text-base">${label}</h3>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-2 text-slate-600">
          <span class="text-lg">👥</span>
          <span class="text-sm"><strong>${clusterSize}</strong> riders nearby</span>
        </div>
      </div>

      <div class="mt-3 pt-3 border-t border-slate-100">
        <p class="text-xs text-slate-500">Stop ${stopNumber} of your route</p>
      </div>
    </div>
  `;
}

function createEndpointPopupHTML(distanceToModiin: string = "~25 km"): string {
  return `
    <div class="bg-white rounded-lg shadow-lg p-4 min-w-64 animate-in fade-in zoom-in-95 duration-200">
      <div class="flex items-start justify-between mb-3">
        <div>
          <div class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-sm mb-2">
            ✓
          </div>
          <h3 class="font-semibold text-slate-900 text-base">Highway On-ramp</h3>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-2 text-slate-600">
          <span class="text-lg">🛣️</span>
          <span class="text-sm">Route to <strong>Modi'in</strong></span>
        </div>
        <div class="flex items-center gap-2 text-slate-600">
          <span class="text-lg">📍</span>
          <span class="text-sm">Distance: <strong>${distanceToModiin}</strong></span>
        </div>
      </div>

      <div class="mt-3 pt-3 border-t border-slate-100">
        <p class="text-xs text-slate-500">End of route 712</p>
      </div>
    </div>
  `;
}

export default function MapboxRouteMap({ route }: MapboxRouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      setError("Mapbox API key not configured");
      return;
    }

    if (map.current) return; // Map already initialized

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/light-v11",
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Fit bounds when route loads
      if (route && route.stops.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        route.stops.forEach((stop) => {
          bounds.extend([stop.lng, stop.lat]);
        });
        bounds.extend([route.endpoint.lng, route.endpoint.lat]);
        map.current.fitBounds(bounds, { padding: 80 });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize map"
      );
    }

    return () => {
      // Cleanup is handled by Next.js
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add route polyline and markers when route changes
  useEffect(() => {
    if (!map.current || !route || route.stops.length === 0) return;

    // Wait for map style to load before adding sources
    const addRouteLayers = () => {
      if (!map.current) return;

      // Remove existing sources and layers
      if (map.current.getSource("route-polyline")) {
        if (map.current.getLayer("route-polyline")) {
          map.current.removeLayer("route-polyline");
        }
        map.current.removeSource("route-polyline");
      }
      if (map.current.getSource("stops")) {
        if (map.current.getLayer("stops")) {
          map.current.removeLayer("stops");
        }
        if (map.current.getLayer("stop-labels")) {
          map.current.removeLayer("stop-labels");
        }
        map.current.removeSource("stops");
      }
      if (map.current.getSource("endpoint")) {
        if (map.current.getLayer("endpoint")) {
          map.current.removeLayer("endpoint");
        }
        if (map.current.getLayer("endpoint-label")) {
          map.current.removeLayer("endpoint-label");
        }
        map.current.removeSource("endpoint");
      }

      // Build polyline path
      const polylinePath = [
        ...route.stops.map((s) => [s.lng, s.lat]),
        [route.endpoint.lng, route.endpoint.lat],
      ] as [number, number][];

      // Add polyline
      map.current.addSource("route-polyline", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: polylinePath,
          },
          properties: {},
        },
      });

      map.current.addLayer({
        id: "route-polyline",
        type: "line",
        source: "route-polyline",
        paint: {
          "line-color": "#2563eb",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });

      // Add stop markers
      const stopFeatures = route.stops.map((stop, i) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [stop.lng, stop.lat],
        },
        properties: {
          label: String(i + 1),
          title: `${stop.label} (${stop.cluster_size} riders nearby)`,
        },
      }));

      map.current.addSource("stops", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: stopFeatures,
        },
      });

      map.current.addLayer({
        id: "stops",
        type: "circle",
        source: "stops",
        paint: {
          "circle-radius": 18,
          "circle-color": "#2563eb",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#1e40af",
        },
      });

      // Add stop labels
      map.current.addLayer({
        id: "stop-labels",
        type: "symbol",
        source: "stops",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-offset": [0, 0],
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Setup hover interactions for stops
      map.current.on("mouseenter", "stops", (e) => {
        if (!map.current) return;

        map.current.getCanvas().style.cursor = "pointer";

        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const stopNumber = parseInt(feature.properties?.label || "0");
          const stopData = route.stops[stopNumber - 1];

          if (stopData) {
            // Remove existing popup
            if (popupRef.current) {
              popupRef.current.remove();
            }

            const popupHTML = createStopPopupHTML(
              stopNumber,
              stopData.label,
              stopData.cluster_size
            );

            popupRef.current = new mapboxgl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: [0, -30],
              className: "mapbox-popup-custom",
            })
              .setLngLat(e.lngLat)
              .setHTML(popupHTML)
              .addTo(map.current);
          }
        }
      });

      map.current.on("mouseleave", "stops", () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "";

        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });

      // Setup hover interactions for endpoint
      map.current.on("mouseenter", "endpoint", (e) => {
        if (!map.current) return;

        map.current.getCanvas().style.cursor = "pointer";

        if (popupRef.current) {
          popupRef.current.remove();
        }

        const popupHTML = createEndpointPopupHTML();

        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: [0, -30],
          className: "mapbox-popup-custom",
        })
          .setLngLat(e.lngLat)
          .setHTML(popupHTML)
          .addTo(map.current);
      });

      map.current.on("mouseleave", "endpoint", () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "";

        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });

      // Add endpoint marker
      map.current.addSource("endpoint", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [route.endpoint.lng, route.endpoint.lat],
          },
          properties: {
            title: "End point: Highway on-ramp to Modi'in",
          },
        },
      });

      map.current.addLayer({
        id: "endpoint",
        type: "circle",
        source: "endpoint",
        paint: {
          "circle-radius": 20,
          "circle-color": "#dc2626",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#7f1d1d",
        },
      });

      // Add endpoint label
      map.current.addLayer({
        id: "endpoint-label",
        type: "symbol",
        source: "endpoint",
        layout: {
          "text-field": "END",
          "text-size": 11,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-offset": [0, 0],
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      route.stops.forEach((stop) => {
        bounds.extend([stop.lng, stop.lat]);
      });
      bounds.extend([route.endpoint.lng, route.endpoint.lat]);
      map.current.fitBounds(bounds, { padding: 80 });
    };

    // Wait for map to be fully loaded before adding layers
    if (map.current.isStyleLoaded()) {
      addRouteLayers();
    } else {
      map.current.on("load", addRouteLayers);
      return () => {
        if (map.current) {
          map.current.off("load", addRouteLayers);
        }
      };
    }
  }, [route]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-50 to-slate-100">
        <div className="text-center px-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <span className="text-xl">⚠️</span>
          </div>
          <p className="text-red-700 font-medium mb-2">Map error</p>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Mapbox popup styling */
        .mapbox-popup-custom {
          max-width: 320px;
        }

        .mapbox-popup-custom .mapboxgl-popup-content {
          background: transparent;
          border: none;
          border-radius: 0;
          box-shadow: none;
          padding: 0;
        }

        .mapbox-popup-custom .mapboxgl-popup-tip {
          display: none;
        }

        /* Popup content animation */
        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .mapbox-popup-custom .mapboxgl-popup-content > div {
          animation: popupFadeIn 0.2s ease-out;
        }

        /* Ensure popup is above map controls */
        .mapbox-popup-custom {
          z-index: 100 !important;
        }

        /* Custom marker hover effect */
        .mapboxgl-canvas-container.mapboxgl-touch-zoom-rotate:hover {
          cursor: pointer;
        }
      `}</style>
      <div ref={mapContainer} className="w-full h-full" />
    </>
  );
}
