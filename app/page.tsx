"use client";

import { useEffect, useState } from "react";
import RouteMap from "@/components/RouteMap";
import RouteStats from "@/components/RouteStats";
import type { Route } from "@/lib/algorithm/types";

export default function Home() {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      {/* Map area */}
      <div className="flex-1 min-h-[50vh] md:min-h-screen relative">
        {loading ? (
          <div className="flex items-center justify-center h-full bg-muted">
            <p className="text-muted-foreground text-sm">
              Computing optimal route...
            </p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full bg-muted">
            <p className="text-destructive text-sm">Error: {error}</p>
          </div>
        ) : (
          <RouteMap route={route} />
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-full md:w-96 border-t md:border-t-0 md:border-r bg-card p-4 md:p-6 overflow-y-auto md:max-h-screen">
        <h1 className="text-xl font-bold mb-2">712 Optimal Route</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Data-driven optimization of bus 712&apos;s Tel Aviv stops.
        </p>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading route data...</p>
        )}

        {error && (
          <p className="text-sm text-destructive">Failed to load route: {error}</p>
        )}

        {route && route.status === "ok" && <RouteStats route={route} />}

        {route && route.status === "insufficient_data" && (
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">{route.message}</p>
          </div>
        )}

        {/* Submission form placeholder */}
        <div className="mt-4 rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            Address submission form coming soon.
          </p>
        </div>
      </aside>
    </main>
  );
}
