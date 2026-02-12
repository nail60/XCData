"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import MetricChart from "@/components/MetricChart";
import SummaryStatsTable from "@/components/SummaryStatsTable";

interface AreaStats {
  totalFlights: number;
  avgAltGain: number | null;
  maxAltGain: number | null;
  avgDistance: number | null;
  maxDistance: number | null;
  avgPoints: number | null;
  maxPoints: number | null;
  avgDuration: number | null;
}

export default function AreaAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      }
    >
      <AreaAnalysisContent />
    </Suspense>
  );
}

function AreaAnalysisContent() {
  const searchParams = useSearchParams();
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "");

  const [stats, setStats] = useState<AreaStats | null>(null);
  const [loading, setLoading] = useState(true);

  const valid = !isNaN(lat) && !isNaN(lng) && !isNaN(radius);

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      return;
    }
    async function fetchStats() {
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radius: String(radius),
        });
        const res = await fetch(`/api/analysis/area-stats?${params}`);
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch area stats:", err);
      }
      setLoading(false);
    }
    fetchStats();
  }, [lat, lng, radius, valid]);

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Invalid area parameters</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const title = `All flights within ${radius}km of ${lat.toFixed(2)}, ${lng.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            &larr; Back to Map
          </Link>
          <h1 className="text-2xl font-bold">Area Analysis</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1">{title}</p>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Flights" value={String(stats.totalFlights)} />
            <StatCard
              label="Avg Alt Gain"
              value={stats.avgAltGain ? `${Math.round(stats.avgAltGain)}m` : "N/A"}
            />
            <StatCard
              label="Max Alt Gain"
              value={stats.maxAltGain ? `${Math.round(stats.maxAltGain)}m` : "N/A"}
            />
            <StatCard
              label="Avg Distance"
              value={stats.avgDistance ? `${stats.avgDistance.toFixed(1)}km` : "N/A"}
            />
          </div>
        )}

        <MetricChart lat={lat} lng={lng} radius={radius} title={title} />

        <SummaryStatsTable lat={lat} lng={lng} radius={radius} />

        {stats && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
            <h3 className="font-semibold text-gray-900 mb-2">Area Info</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>Center: {lat.toFixed(4)}, {lng.toFixed(4)}</div>
              <div>Radius: {radius} km</div>
              <div>Max Distance: {stats.maxDistance?.toFixed(1) ?? "N/A"} km</div>
              <div>Max Points: {stats.maxPoints?.toFixed(1) ?? "N/A"}</div>
              <div>Avg Duration: {stats.avgDuration ? `${Math.round(stats.avgDuration)} min` : "N/A"}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
