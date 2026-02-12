"use client";

import Link from "next/link";
import type { SiteWithStats } from "@/types";

interface SitePanelProps {
  site: SiteWithStats | null;
  onClose: () => void;
}

export default function SitePanel({ site, onClose }: SitePanelProps) {
  if (!site) return null;

  return (
    <div className="bg-white border-l border-gray-200 p-4 w-80 overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-bold">{site.name}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
          &times;
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded p-2">
            <div className="text-gray-500 text-xs">Flights</div>
            <div className="font-semibold text-lg">{site.flightCount}</div>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <div className="text-gray-500 text-xs">Avg Alt Gain</div>
            <div className="font-semibold text-lg">
              {site.avgAltGain ? `${Math.round(site.avgAltGain)}m` : "N/A"}
            </div>
          </div>
        </div>

        {site.elevationM && (
          <div className="text-gray-600">
            Elevation: {site.elevationM}m
          </div>
        )}
        {site.country && (
          <div className="text-gray-600">
            {site.region ? `${site.region}, ` : ""}
            {site.country}
          </div>
        )}

        <div className="text-gray-500 text-xs">
          {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
        </div>

        <Link
          href={`/sites/${site.id}`}
          className="block w-full text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
        >
          View Analysis
        </Link>
      </div>
    </div>
  );
}
