"use client";

import type { Metric, Aggregation } from "@/types";

const METRIC_LABELS: Record<Metric, string> = {
  alt_gain: "Altitude Gain",
  total_alt_gain: "Total Alt Gain",
  xcontest_points: "XContest Points",
  five_point_distance: "5-Point Distance",
  track_distance: "Track Distance",
  max_alt: "Max Altitude",
};

const METRIC_UNITS: Record<Metric, string> = {
  alt_gain: "m",
  total_alt_gain: "m",
  xcontest_points: "pts",
  five_point_distance: "km",
  track_distance: "km",
  max_alt: "m",
};

interface MetricSelectorProps {
  metric: Metric;
  aggregation: Aggregation;
  onMetricChange: (metric: Metric) => void;
  onAggregationChange: (agg: Aggregation) => void;
}

export default function MetricSelector({
  metric,
  aggregation,
  onMetricChange,
  onAggregationChange,
}: MetricSelectorProps) {
  return (
    <div className="flex items-center gap-4">
      <div>
        <label className="text-sm text-gray-600 block mb-1">Metric</label>
        <select
          value={metric}
          onChange={(e) => onMetricChange(e.target.value as Metric)}
          className="border rounded px-3 py-1.5 text-sm bg-white"
        >
          {Object.entries(METRIC_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label} ({METRIC_UNITS[key as Metric]})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-gray-600 block mb-1">Aggregation</label>
        <div className="flex rounded border overflow-hidden">
          {(["sum", "mean", "median"] as Aggregation[]).map((agg) => (
            <button
              key={agg}
              onClick={() => onAggregationChange(agg)}
              className={`px-3 py-1.5 text-sm capitalize ${
                aggregation === agg
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {agg}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { METRIC_LABELS, METRIC_UNITS };
