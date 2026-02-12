"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import MetricChart from "@/components/MetricChart";
import SummaryStatsTable from "@/components/SummaryStatsTable";

interface SiteDetail {
  site: {
    id: number;
    name: string;
    lat: number;
    lng: number;
    elevationM: number | null;
    country: string | null;
    region: string | null;
  };
  stats: {
    totalFlights: number;
    avgAltGain: number | null;
    maxAltGain: number | null;
    avgDistance: number | null;
    maxDistance: number | null;
    avgPoints: number | null;
    maxPoints: number | null;
    avgDuration: number | null;
  };
  monthlyBreakdown: { month: number; flightCount: number; avgAltGain: number | null }[];
}

export default function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSite() {
      try {
        const res = await fetch(`/api/sites/${id}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch site:", err);
      }
      setLoading(false);
    }
    fetchSite();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Site not found</div>
      </div>
    );
  }

  const { site, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            &larr; Back to Map
          </Link>
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <span className="text-gray-500 text-sm">
            {site.region ? `${site.region}, ` : ""}
            {site.country}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Key stats row */}
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

        {/* Main time-series chart */}
        <MetricChart siteId={site.id} siteName={site.name} />

        {/* Summary stats table */}
        <SummaryStatsTable siteId={site.id} />

        {/* Site info */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
          <h3 className="font-semibold text-gray-900 mb-2">Site Info</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>Coordinates: {site.lat.toFixed(4)}, {site.lng.toFixed(4)}</div>
            {site.elevationM && <div>Elevation: {site.elevationM}m</div>}
            <div>Max Distance: {stats.maxDistance?.toFixed(1) ?? "N/A"} km</div>
            <div>Max Points: {stats.maxPoints?.toFixed(1) ?? "N/A"}</div>
            <div>Avg Duration: {stats.avgDuration ? `${Math.round(stats.avgDuration)} min` : "N/A"}</div>
          </div>
        </div>
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
