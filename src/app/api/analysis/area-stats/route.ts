import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flights } from "@/lib/db/schema";
import { and, gte, lte, eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  const lng = params.get("lng") ? parseFloat(params.get("lng")!) : null;
  const radius = params.get("radius") ? parseFloat(params.get("radius")!) : null;

  if (lat == null || lng == null || radius == null) {
    return NextResponse.json(
      { error: "lat, lng, and radius are required" },
      { status: 400 }
    );
  }

  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const gliderCategory = params.get("gliderCategory");

  const distanceExpr = sql`(
    6371 * acos(
      cos(radians(${lat})) * cos(radians(${flights.launchLat})) *
      cos(radians(${flights.launchLng}) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(${flights.launchLat}))
    )
  )`;

  const conditions = [sql`${distanceExpr} <= ${radius}`];
  if (dateFrom) conditions.push(gte(flights.flightDate, dateFrom));
  if (dateTo) conditions.push(lte(flights.flightDate, dateTo));
  if (gliderCategory) conditions.push(eq(flights.gliderCategory, gliderCategory));

  const [result] = await db
    .select({
      totalFlights: sql<number>`count(*)`.as("total_flights"),
      avgAltGain: sql<number>`avg(${flights.altGainM})`.as("avg_alt_gain"),
      maxAltGain: sql<number>`max(${flights.altGainM})`.as("max_alt_gain"),
      avgDistance: sql<number>`avg(${flights.distanceKm})`.as("avg_distance"),
      maxDistance: sql<number>`max(${flights.distanceKm})`.as("max_distance"),
      avgPoints: sql<number>`avg(${flights.xcontestPoints})`.as("avg_points"),
      maxPoints: sql<number>`max(${flights.xcontestPoints})`.as("max_points"),
      avgDuration: sql<number>`avg(${flights.durationMin})`.as("avg_duration"),
    })
    .from(flights)
    .where(and(...conditions));

  return NextResponse.json(result);
}
