"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SiteComparisonChart from "@/components/SiteComparisonChart";

interface SiteOption {
  id: number;
  name: string;
}

export default function ComparePage() {
  const [sites, setSites] = useState<SiteOption[]>([]);

  useEffect(() => {
    async function fetchSites() {
      const res = await fetch("/api/sites");
      const data = await res.json();
      setSites(data.map((s: { id: number; name: string }) => ({ id: s.id, name: s.name })));
    }
    fetchSites();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            &larr; Back to Map
          </Link>
          <h1 className="text-2xl font-bold">Site Comparison</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <SiteComparisonChart availableSites={sites} />
      </main>
    </div>
  );
}
