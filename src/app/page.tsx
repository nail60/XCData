"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import FilterControls from "@/components/FilterControls";
import SitePanel from "@/components/SitePanel";
import type { SiteWithStats } from "@/types";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [sites, setSites] = useState<SiteWithStats[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteWithStats | null>(null);
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(20);
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2025-12-31");
  const [gliderCategory, setGliderCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("37.7749,-122.4194");
  const [center] = useState<[number, number]>([37.7749, -122.4194]);

  const fetchSites = useCallback(async () => {
    const params = new URLSearchParams();

    if (searchLocation) {
      params.set("lat", String(searchLocation[0]));
      params.set("lng", String(searchLocation[1]));
      params.set("radius", String(radius));
    }

    const res = await fetch(`/api/sites?${params}`);
    const data = await res.json();
    setSites(data);
  }, [searchLocation, radius]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const handleSearch = () => {
    const parts = searchQuery.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      setSearchLocation([parts[0], parts[1]]);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSearchLocation([lat, lng]);
    setSearchQuery(`${lat.toFixed(4)},${lng.toFixed(4)}`);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-2">
        <h1 className="text-xl font-bold">XCData - Flying Site Analyzer</h1>
      </header>

      <FilterControls
        radius={radius}
        onRadiusChange={setRadius}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        gliderCategory={gliderCategory}
        onGliderCategoryChange={setGliderCategory}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <Map
            sites={sites}
            selectedSite={selectedSite}
            onSiteSelect={setSelectedSite}
            onMapClick={handleMapClick}
            center={center}
            radius={radius}
            searchLocation={searchLocation}
          />
        </div>
        <SitePanel site={selectedSite} onClose={() => setSelectedSite(null)} />
      </div>
    </div>
  );
}
