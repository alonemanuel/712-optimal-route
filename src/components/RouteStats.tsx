"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Route } from "@/lib/algorithm/types";

interface RouteStatsProps {
  route: Route;
}

interface StatItemProps {
  label: string;
  value: string;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 border border-blue-100">
      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-blue-700">{value}</p>
    </div>
  );
}

export default function RouteStats({ route }: RouteStatsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Route Statistics</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatItem label="Stops" value={String(route.K)} />
          <StatItem
            label="Avg Walk"
            value={`${Math.round(route.avg_walk_distance_m)}m`}
          />
          <StatItem
            label="Coverage"
            value={`${route.coverage_400m_pct.toFixed(1)}%`}
          />
          <StatItem
            label="Submissions"
            value={String(route.total_submissions)}
          />
          <StatItem
            label="Valid Data"
            value={String(route.valid_submissions)}
          />
          <StatItem
            label="Route Length"
            value={`${(route.route_distance_m / 1000).toFixed(1)}km`}
          />
        </div>
      </div>
    </div>
  );
}
