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
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function RouteStats({ route }: RouteStatsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Route Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Stops" value={String(route.K)} />
          <StatItem
            label="Avg Walk"
            value={`${Math.round(route.avg_walk_distance_m)}m`}
          />
          <StatItem
            label="Coverage (400m)"
            value={`${route.coverage_400m_pct.toFixed(1)}%`}
          />
          <StatItem
            label="Submissions"
            value={String(route.total_submissions)}
          />
          <StatItem
            label="Valid"
            value={String(route.valid_submissions)}
          />
          <StatItem
            label="Route Length"
            value={`${(route.route_distance_m / 1000).toFixed(1)}km`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
