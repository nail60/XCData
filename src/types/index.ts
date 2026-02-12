export type Metric =
  | "alt_gain"
  | "total_alt_gain"
  | "xcontest_points"
  | "five_point_distance"
  | "track_distance"
  | "max_alt";

export type Aggregation = "sum" | "mean" | "median";

export interface MetricDataPoint {
  period: string;
  value: number;
  flightCount: number;
}

export interface SiteWithStats {
  id: number;
  name: string;
  lat: number;
  lng: number;
  elevationM: number | null;
  country: string | null;
  region: string | null;
  flightCount: number;
  avgAltGain: number | null;
}

export interface FlightSummary {
  id: number;
  xcontestId: string;
  pilotName: string | null;
  launchAltM: number | null;
  maxAltM: number | null;
  altGainM: number | null;
  distanceKm: number | null;
  fivePointDistanceKm: number | null;
  xcontestPoints: number | null;
  durationMin: number | null;
  gliderCategory: string | null;
  flightDate: string;
  routeType: string | null;
  xcontestUrl: string | null;
}

export interface ScrapeOptions {
  lat: number;
  lng: number;
  radius: number;
  from: string;
  to: string;
  country?: string;
  region?: string;
  delayMs?: number;
}
