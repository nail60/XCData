"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import MetricSelector, { METRIC_LABELS, METRIC_UNITS } from "./MetricSelector";
import type { Metric, Aggregation, MetricDataPoint } from "@/types";

interface MetricChartProps {
  siteId: number;
  siteName: string;
}

const YEAR_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6"];

export default function MetricChart({ siteId, siteName }: MetricChartProps) {
  const [metric, setMetric] = useState<Metric>("alt_gain");
  const [aggregation, setAggregation] = useState<Aggregation>("mean");
  const [data, setData] = useState<MetricDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number[]>([2024]);
  const [availableYears] = useState([2023, 2024, 2025]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const allData: MetricDataPoint[] = [];
        for (const year of selectedYears) {
          const params = new URLSearchParams({
            siteId: String(siteId),
            metric,
            aggregation,
            year: String(year),
          });
          const res = await fetch(`/api/analysis/metrics?${params}`);
          const yearData: MetricDataPoint[] = await res.json();
          allData.push(...yearData);
        }
        setData(allData);
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
      }
      setLoading(false);
    }
    fetchData();
  }, [siteId, metric, aggregation, selectedYears]);

  // Transform data for multi-year overlay: group by month
  const chartData = (() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: String(i + 1).padStart(2, "0"),
      label: new Date(2024, i).toLocaleString("default", { month: "short" }),
    }));

    return months.map(({ month, label }) => {
      const point: Record<string, string | number> = { month: label };
      for (const year of selectedYears) {
        const match = data.find((d) => d.period === `${year}-${month}`);
        point[`y${year}`] = match?.value ?? 0;
        point[`count${year}`] = match?.flightCount ?? 0;
      }
      return point;
    });
  })();

  const unit = METRIC_UNITS[metric];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-4">{siteName} - Time Series</h3>

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <MetricSelector
          metric={metric}
          aggregation={aggregation}
          onMetricChange={setMetric}
          onAggregationChange={setAggregation}
        />

        <div>
          <label className="text-sm text-gray-600 block mb-1">Years</label>
          <div className="flex gap-1">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() =>
                  setSelectedYears((prev) =>
                    prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y]
                  )
                }
                className={`px-2 py-1 text-sm rounded ${
                  selectedYears.includes(y)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: unit, angle: -90, position: "insideLeft" }} />
            <Tooltip
              formatter={(value, name) => {
                const year = String(name).replace("y", "");
                return [`${Math.round(Number(value))} ${unit}`, year];
              }}
              labelFormatter={(label) => `${label}`}
            />
            <Legend formatter={(value) => value.replace("y", "")} />
            {selectedYears.map((year, i) =>
              selectedYears.length === 1 ? (
                <Bar
                  key={year}
                  dataKey={`y${year}`}
                  fill={YEAR_COLORS[i % YEAR_COLORS.length]}
                  name={`y${year}`}
                  radius={[2, 2, 0, 0]}
                />
              ) : (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={`y${year}`}
                  stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                  name={`y${year}`}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
