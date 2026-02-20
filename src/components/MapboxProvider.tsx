"use client";

import mapboxgl from "mapbox-gl";
import { createContext, useContext } from "react";

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

interface MapboxContextValue {
  ready: boolean;
}

const MapboxContext = createContext<MapboxContextValue>({
  ready: false,
});

export function MapboxProvider({ children }: { children: React.ReactNode }) {
  return (
    <MapboxContext.Provider value={{ ready: !!mapboxgl.accessToken }}>
      {children}
    </MapboxContext.Provider>
  );
}

export function useMapbox() {
  return useContext(MapboxContext);
}
