export interface RawFlightData {
  id: string;
  pilot: { name: string; country: string } | null;
  launch: { lat: number; lng: number; alt?: number } | null;
  landing: { lat: number; lng: number; alt?: number } | null;
  maxAlt?: number;
  totalAltGain?: number;
  distance?: number;
  fivePointDistance?: number;
  points?: number;
  duration?: number; // seconds
  avgSpeed?: number;
  gliderCategory?: string;
  date: string; // YYYY-MM-DD
  routeType?: string;
  url?: string;
}

/**
 * Parse the XContest flights JSON data structure.
 * XContest uses `XContest.run('flights', { ... })` which embeds flight data
 * as a JS object. The structure varies but generally includes flight arrays
 * with nested pilot, launch, and stats data.
 */
export function parseFlightsFromXContestData(data: unknown): RawFlightData[] {
  const flights: RawFlightData[] = [];

  if (!data || typeof data !== "object") return flights;

  // The XContest flights response typically has flights in a list/array
  const items = findFlightArray(data);
  if (!items) return flights;

  for (const item of items) {
    try {
      const flight = extractFlightData(item);
      if (flight) flights.push(flight);
    } catch {
      // Skip malformed entries
    }
  }

  return flights;
}

function findFlightArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Common keys where XContest stores flight lists
    for (const key of ["flights", "list", "items", "data", "rows"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    // Recurse one level
    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0) return val;
    }
  }

  return null;
}

function extractFlightData(item: unknown): RawFlightData | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;

  // Extract ID - required
  const id = String(obj.id ?? obj.flightId ?? obj.flight_id ?? "");
  if (!id) return null;

  // Extract date - required
  const dateRaw = obj.date ?? obj.dateOfFlight ?? obj.startTime ?? "";
  const date = extractDate(String(dateRaw));
  if (!date) return null;

  // Extract pilot info
  const pilotObj = obj.pilot as Record<string, unknown> | undefined;
  const pilot = pilotObj
    ? { name: String(pilotObj.name ?? ""), country: String(pilotObj.country ?? pilotObj.nationality ?? "") }
    : null;

  // Extract launch coordinates
  const launchObj = (obj.launch ?? obj.takeoff ?? obj.start) as Record<string, unknown> | undefined;
  const launch = launchObj
    ? {
        lat: Number(launchObj.lat ?? launchObj.latitude ?? 0),
        lng: Number(launchObj.lng ?? launchObj.lon ?? launchObj.longitude ?? 0),
        alt: launchObj.alt !== undefined ? Number(launchObj.alt) : undefined,
      }
    : null;

  // Extract landing
  const landingObj = (obj.landing ?? obj.end) as Record<string, unknown> | undefined;
  const landing = landingObj
    ? {
        lat: Number(landingObj.lat ?? landingObj.latitude ?? 0),
        lng: Number(landingObj.lng ?? landingObj.lon ?? landingObj.longitude ?? 0),
        alt: landingObj.alt !== undefined ? Number(landingObj.alt) : undefined,
      }
    : null;

  // Extract stats
  const stats = (obj.stats ?? obj.statistics ?? obj) as Record<string, unknown>;

  return {
    id,
    pilot,
    launch,
    landing,
    maxAlt: numOrUndefined(stats.maxAlt ?? stats.max_alt ?? stats.maxAltitude ?? obj.maxAlt),
    totalAltGain: numOrUndefined(stats.totalAltGain ?? stats.total_alt_gain ?? stats.altitudeGain ?? obj.totalAltGain),
    distance: numOrUndefined(stats.distance ?? obj.distance ?? obj.dist),
    fivePointDistance: numOrUndefined(stats.fivePointDistance ?? obj.fivePointDistance ?? obj.pointsDistance),
    points: numOrUndefined(stats.points ?? obj.points ?? obj.score),
    duration: extractDurationSec(stats.duration ?? obj.duration ?? obj.time),
    avgSpeed: numOrUndefined(stats.avgSpeed ?? obj.avgSpeed ?? obj.speed),
    gliderCategory: String(obj.gliderCategory ?? obj.glider_category ?? obj.wingCategory ?? stats.gliderCategory ?? ""),
    date,
    routeType: String(obj.routeType ?? obj.route_type ?? obj.type ?? stats.routeType ?? ""),
    url: obj.url ? String(obj.url) : undefined,
  };
}

function numOrUndefined(val: unknown): number | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

function extractDate(raw: string): string | null {
  // Try ISO format YYYY-MM-DD
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[0];

  // Try DD.MM.YYYY
  const match2 = raw.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (match2) return `${match2[3]}-${match2[2]}-${match2[1]}`;

  return null;
}

function extractDurationSec(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;

  // If it's already a number (seconds)
  if (typeof val === "number") return val;

  const str = String(val);
  // HH:MM:SS format
  const match = str.match(/(\d+):(\d+):(\d+)/);
  if (match) {
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  }
  // MM:SS format
  const match2 = str.match(/(\d+):(\d+)/);
  if (match2) {
    return Number(match2[1]) * 60 + Number(match2[2]);
  }

  return undefined;
}

/** Haversine distance in km between two lat/lng points */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
