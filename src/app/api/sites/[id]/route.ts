import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sites, flights } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const siteId = parseInt(id);

  const site = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (site.length === 0) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // Aggregated stats
  const stats = await db
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
    .where(eq(flights.siteId, siteId));

  // Monthly flight counts
  const monthlyBreakdown = await db
    .select({
      month: flights.flightMonth,
      flightCount: sql<number>`count(*)`.as("flight_count"),
      avgAltGain: sql<number>`avg(${flights.altGainM})`.as("avg_alt_gain"),
    })
    .from(flights)
    .where(eq(flights.siteId, siteId))
    .groupBy(flights.flightMonth)
    .orderBy(flights.flightMonth);

  return NextResponse.json({
    site: site[0],
    stats: stats[0],
    monthlyBreakdown,
  });
}
