"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SiteWithStats } from "@/types";

// Fix Leaflet default icon issue with Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function siteIcon(avgAltGain: number | null) {
  const gain = avgAltGain ?? 0;
  let color: string;
  if (gain > 1000) color = "#dc2626"; // red - excellent
  else if (gain > 500) color = "#f97316"; // orange - good
  else if (gain > 200) color = "#eab308"; // yellow - moderate
  else color = "#22c55e"; // green - mild

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

interface MapProps {
  sites: SiteWithStats[];
  selectedSite: SiteWithStats | null;
  onSiteSelect: (site: SiteWithStats) => void;
  onMapClick: (lat: number, lng: number) => void;
  center: [number, number];
  radius: number;
  searchLocation: [number, number] | null;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function Map({
  sites,
  selectedSite,
  onSiteSelect,
  onMapClick,
  center,
  radius,
  searchLocation,
}: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full h-full bg-gray-100 animate-pulse" />;
  }

  return (
    <MapContainer center={center} zoom={9} className="w-full h-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onMapClick} />

      {searchLocation && (
        <>
          <Marker position={searchLocation} icon={defaultIcon}>
            <Popup>Search center</Popup>
          </Marker>
          <Circle
            center={searchLocation}
            radius={radius * 1000}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08 }}
          />
        </>
      )}

      {sites.map((site) => (
        <Marker
          key={site.id}
          position={[site.lat, site.lng]}
          icon={siteIcon(site.avgAltGain)}
          eventHandlers={{ click: () => onSiteSelect(site) }}
        >
          <Popup>
            <div className="text-sm">
              <strong>{site.name}</strong>
              <br />
              Flights: {site.flightCount}
              <br />
              Avg gain: {site.avgAltGain ? `${Math.round(site.avgAltGain)}m` : "N/A"}
              {site.elevationM && (
                <>
                  <br />
                  Elevation: {site.elevationM}m
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
