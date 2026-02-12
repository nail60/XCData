import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sites, flights } from "@/lib/db/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  const lng = params.get("lng") ? parseFloat(params.get("lng")!) : null;
  const radius = params.get("radius") ? parseFloat(params.get("radius")!) : null;
  const bounds = params.get("bounds"); // sw_lat,sw_lng,ne_lat,ne_lng

  let query;

  if (lat !== null && lng !== null && radius !== null) {
    // Proximity query using Haversine formula
    const distanceExpr = sql`(
      6371 * acos(
        cos(radians(${lat})) * cos(radians(${sites.lat})) *
        cos(radians(${sites.lng}) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(${sites.lat}))
      )
    )`;

    const result = await db
      .select({
        id: sites.id,
        name: sites.name,
        lat: sites.lat,
        lng: sites.lng,
        elevationM: sites.elevationM,
        country: sites.country,
        region: sites.region,
        distance: distanceExpr.as("distance"),
        flightCount: sql<number>`count(${flights.id})`.as("flight_count"),
        avgAltGain: sql<number>`avg(${flights.altGainM})`.as("avg_alt_gain"),
      })
      .from(sites)
      .leftJoin(flights, eq(flights.siteId, sites.id))
      .groupBy(sites.id)
      .having(sql`${distanceExpr} <= ${radius}`)
      .orderBy(sql`distance`);

    return NextResponse.json(result);
  }

  if (bounds) {
    const [swLat, swLng, neLat, neLng] = bounds.split(",").map(Number);
    const result = await db
      .select({
        id: sites.id,
        name: sites.name,
        lat: sites.lat,
        lng: sites.lng,
        elevationM: sites.elevationM,
        country: sites.country,
        region: sites.region,
        flightCount: sql<number>`count(${flights.id})`.as("flight_count"),
        avgAltGain: sql<number>`avg(${flights.altGainM})`.as("avg_alt_gain"),
      })
      .from(sites)
      .leftJoin(flights, eq(flights.siteId, sites.id))
      .where(
        and(
          gte(sites.lat, swLat),
          lte(sites.lat, neLat),
          gte(sites.lng, swLng),
          lte(sites.lng, neLng)
        )
      )
      .groupBy(sites.id);

    return NextResponse.json(result);
  }

  // Default: return all sites with stats
  const result = await db
    .select({
      id: sites.id,
      name: sites.name,
      lat: sites.lat,
      lng: sites.lng,
      elevationM: sites.elevationM,
      country: sites.country,
      region: sites.region,
      flightCount: sql<number>`count(${flights.id})`.as("flight_count"),
      avgAltGain: sql<number>`avg(${flights.altGainM})`.as("avg_alt_gain"),
    })
    .from(sites)
    .leftJoin(flights, eq(flights.siteId, sites.id))
    .groupBy(sites.id)
    .orderBy(sql`flight_count DESC`);

  return NextResponse.json(result);
}
