"use client";

import { useState, useEffect } from "react";
import type { Metric } from "@/types";
import { METRIC_LABELS, METRIC_UNITS } from "./MetricSelector";

interface SummaryStats {
  metric: Metric;
  label: string;
  unit: string;
  sum: number | null;
  mean: number | null;
  median: number | null;
}

type SummaryStatsTableProps = {
  dateFrom?: string;
  dateTo?: string;
} & (
  | { siteId: number; lat?: undefined; lng?: undefined; radius?: undefined }
  | { lat: number; lng: number; radius: number; siteId?: undefined }
);

const ALL_METRICS: Metric[] = [
  "alt_gain",
  "total_alt_gain",
  "max_alt",
  "xcontest_points",
  "five_point_distance",
  "track_distance",
];

export default function SummaryStatsTable(props: SummaryStatsTableProps) {
  const { siteId, dateFrom, dateTo } = props;
  const lat = "lat" in props ? props.lat : undefined;
  const lng = "lng" in props ? props.lng : undefined;
  const radius = "radius" in props ? props.radius : undefined;
  const [stats, setStats] = useState<SummaryStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchAllStats() {
      setLoading(true);
      try {
        const results: SummaryStats[] = [];

        for (const metric of ALL_METRICS) {
          const aggregations = await Promise.all(
            (["sum", "mean", "median"] as const).map(async (agg) => {
              const params = new URLSearchParams({
                metric,
                aggregation: agg,
              });
              if (siteId != null) {
                params.set("siteId", String(siteId));
              } else if (lat != null && lng != null && radius != null) {
                params.set("lat", String(lat));
                params.set("lng", String(lng));
                params.set("radius", String(radius));
              }
              if (dateFrom) params.set("dateFrom", dateFrom);
              if (dateTo) params.set("dateTo", dateTo);

              const res = await fetch(`/api/analysis/metrics?${params}`);
              const data: { period: string; value: number; flightCount: number }[] = await res.json();

              // Sum all period values for sum, average for mean/median
              if (data.length === 0) return null;
              if (agg === "sum") return data.reduce((acc, d) => acc + (d.value ?? 0), 0);
              const vals = data.map((d) => d.value).filter((v) => v != null);
              return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
            })
          );

          results.push({
            metric,
            label: METRIC_LABELS[metric],
            unit: METRIC_UNITS[metric],
            sum: aggregations[0],
            mean: aggregations[1],
            median: aggregations[2],
          });
        }

        setStats(results);
      } catch (err) {
        console.error("Failed to fetch summary stats:", err);
      }
      setLoading(false);
    }
    fetchAllStats();
  }, [siteId, lat, lng, radius, dateFrom, dateTo]);

  const fmt = (val: number | null, unit: string) =>
    val !== null ? `${Math.round(val)} ${unit}` : "—";

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
        <div className="h-32 flex items-center justify-center text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 font-medium text-gray-600">Metric</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">Sum</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">Mean</th>
              <th className="text-right py-2 px-4 font-medium text-gray-600">Median</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.metric} className="border-b border-gray-100">
                <td className="py-2 pr-4">{s.label}</td>
                <td className="text-right py-2 px-4 font-mono">{fmt(s.sum, s.unit)}</td>
                <td className="text-right py-2 px-4 font-mono">{fmt(s.mean, s.unit)}</td>
                <td className="text-right py-2 px-4 font-mono">{fmt(s.median, s.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
