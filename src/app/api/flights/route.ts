import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flights, sites } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const siteId = params.get("siteId") ? parseInt(params.get("siteId")!) : null;
  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  const lng = params.get("lng") ? parseFloat(params.get("lng")!) : null;
  const radius = params.get("radius") ? parseFloat(params.get("radius")!) : null;
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const gliderCategory = params.get("gliderCategory");
  const limit = parseInt(params.get("limit") ?? "100");
  const offset = parseInt(params.get("offset") ?? "0");

  const conditions = [];

  if (siteId !== null) {
    conditions.push(eq(flights.siteId, siteId));
  }

  if (dateFrom) {
    conditions.push(gte(flights.flightDate, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(flights.flightDate, dateTo));
  }
  if (gliderCategory) {
    conditions.push(eq(flights.gliderCategory, gliderCategory));
  }

  // Proximity-based query
  if (lat !== null && lng !== null && radius !== null) {
    const distanceExpr = sql`(
      6371 * acos(
        cos(radians(${lat})) * cos(radians(${flights.launchLat})) *
        cos(radians(${flights.launchLng}) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(${flights.launchLat}))
      )
    )`;

    conditions.push(sql`${distanceExpr} <= ${radius}`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      id: flights.id,
      xcontestId: flights.xcontestId,
      siteId: flights.siteId,
      siteName: sites.name,
      pilotName: flights.pilotName,
      launchLat: flights.launchLat,
      launchLng: flights.launchLng,
      launchAltM: flights.launchAltM,
      maxAltM: flights.maxAltM,
      altGainM: flights.altGainM,
      totalAltGainM: flights.totalAltGainM,
      distanceKm: flights.distanceKm,
      fivePointDistanceKm: flights.fivePointDistanceKm,
      xcontestPoints: flights.xcontestPoints,
      durationMin: flights.durationMin,
      avgSpeedKmh: flights.avgSpeedKmh,
      gliderCategory: flights.gliderCategory,
      flightDate: flights.flightDate,
      routeType: flights.routeType,
      xcontestUrl: flights.xcontestUrl,
    })
    .from(flights)
    .leftJoin(sites, eq(flights.siteId, sites.id))
    .where(where)
    .orderBy(sql`${flights.flightDate} DESC`)
    .limit(limit)
    .offset(offset);

  return NextResponse.json(result);
}
