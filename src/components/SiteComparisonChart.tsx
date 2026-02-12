"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import MetricSelector, { METRIC_UNITS } from "./MetricSelector";
import type { Metric, Aggregation } from "@/types";

interface SiteOption {
  id: number;
  name: string;
}

interface ComparisonData {
  siteId: number;
  siteName: string;
  data: { period: string; value: number; flightCount: number }[];
}

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"];

interface SiteComparisonChartProps {
  availableSites: SiteOption[];
}

export default function SiteComparisonChart({ availableSites }: SiteComparisonChartProps) {
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [metric, setMetric] = useState<Metric>("alt_gain");
  const [aggregation, setAggregation] = useState<Aggregation>("mean");
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedSiteIds.length === 0) {
      setComparisonData([]);
      return;
    }

    async function fetchComparison() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          siteIds: selectedSiteIds.join(","),
          metric,
          aggregation,
        });
        const res = await fetch(`/api/analysis/site-comparison?${params}`);
        const data: ComparisonData[] = await res.json();
        setComparisonData(data);
      } catch (err) {
        console.error("Failed to fetch comparison:", err);
      }
      setLoading(false);
    }
    fetchComparison();
  }, [selectedSiteIds, metric, aggregation]);

  // Build chart data: unique periods across all sites
  const allPeriods = [...new Set(comparisonData.flatMap((s) => s.data.map((d) => d.period)))].sort();
  const chartData = allPeriods.map((period) => {
    const point: Record<string, string | number> = { period };
    for (const site of comparisonData) {
      const match = site.data.find((d) => d.period === period);
      point[site.siteName] = match?.value ?? 0;
    }
    return point;
  });

  const unit = METRIC_UNITS[metric];

  const toggleSite = (id: number) => {
    setSelectedSiteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-4">Site Comparison</h3>

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <MetricSelector
          metric={metric}
          aggregation={aggregation}
          onMetricChange={setMetric}
          onAggregationChange={setAggregation}
        />

        <div>
          <label className="text-sm text-gray-600 block mb-1">Sites (max 4)</label>
          <div className="flex flex-wrap gap-1">
            {availableSites.map((site) => (
              <button
                key={site.id}
                onClick={() => toggleSite(site.id)}
                className={`px-2 py-1 text-xs rounded ${
                  selectedSiteIds.includes(site.id)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {site.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">Loading...</div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: unit, angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(value) => `${Math.round(Number(value))} ${unit}`} />
            <Legend />
            {comparisonData.map((site, i) => (
              <Line
                key={site.siteId}
                type="monotone"
                dataKey={site.siteName}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-400">
          Select sites to compare
        </div>
      )}
    </div>
  );
}
