"use client";

import { useEffect, useState, useCallback } from "react";
import { MapboxProvider } from "@/components/MapboxProvider";
import MapboxRouteMap from "@/components/MapboxRouteMap";
import RouteStats from "@/components/RouteStats";
import AddressForm from "@/components/AddressForm";
import type { Route } from "@/lib/algorithm/types";

export default function Home() {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/route/mock")
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data: Route) => {
        setRoute(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  return (
    <MapboxProvider>
      <main className="flex min-h-screen flex-col md:flex-row bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Map area */}
        <div className="flex-1 min-h-[50vh] md:min-h-screen relative shadow-lg">
          {loading && !route ? (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-slate-100">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 font-medium">Computing optimal route...</p>
              </div>
            </div>
          ) : error && !route ? (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-50 to-slate-100">
              <div className="text-center px-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                  <span className="text-xl">⚠️</span>
                </div>
                <p className="text-red-700 font-medium mb-2">Error loading map</p>
                <p className="text-sm text-slate-600">Make sure your Mapbox API key is set.</p>
              </div>
            </div>
          ) : (
            <MapboxRouteMap route={route} />
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full md:w-[420px] border-t md:border-t-0 md:border-l bg-white shadow-2xl md:shadow-none overflow-y-auto md:max-h-screen">
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-8">
            <h1 className="text-2xl font-bold mb-2">712 Optimal Route</h1>
            <p className="text-blue-100 text-sm">
              Data-driven optimization of bus 712&apos;s Tel Aviv stops
            </p>
          </div>

          <div className="p-6 space-y-6">
            {error && !route && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">
                  <strong>Connection issue:</strong> {error}
                </p>
              </div>
            )}

            {route && route.status === "ok" && (
              <>
                <RouteStats route={route} />
                <div className="border-t pt-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Submit Your Address</h2>
                  <AddressForm onSubmitted={fetchRoute} />
                </div>
              </>
            )}

            {route && route.status === "insufficient_data" && (
              <>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm text-amber-900">{route.message}</p>
                </div>
                <div className="border-t pt-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Submit Your Address</h2>
                  <AddressForm onSubmitted={fetchRoute} />
                </div>
              </>
            )}
          </div>
        </aside>
      </main>
    </MapboxProvider>
  );
}
