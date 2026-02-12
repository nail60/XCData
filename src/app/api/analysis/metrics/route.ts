import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flights } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type { Metric, Aggregation } from "@/types";

const METRIC_COLUMNS: Record<Metric, ReturnType<typeof sql>> = {
  alt_gain: sql`${flights.altGainM}`,
  total_alt_gain: sql`${flights.totalAltGainM}`,
  xcontest_points: sql`${flights.xcontestPoints}`,
  five_point_distance: sql`${flights.fivePointDistanceKm}`,
  track_distance: sql`${flights.distanceKm}`,
  max_alt: sql`${flights.maxAltM}`,
};

function getAggregationSql(metric: Metric, aggregation: Aggregation) {
  const col = METRIC_COLUMNS[metric];
  switch (aggregation) {
    case "sum":
      return sql`sum(${col})`;
    case "mean":
      return sql`avg(${col})`;
    case "median":
      return sql`percentile_cont(0.5) within group (order by ${col})`;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const siteId = params.get("siteId") ? parseInt(params.get("siteId")!) : null;
  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  const lng = params.get("lng") ? parseFloat(params.get("lng")!) : null;
  const radius = params.get("radius") ? parseFloat(params.get("radius")!) : null;
  const metric = (params.get("metric") ?? "alt_gain") as Metric;
  const aggregation = (params.get("aggregation") ?? "mean") as Aggregation;
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const gliderCategory = params.get("gliderCategory");
  const year = params.get("year") ? parseInt(params.get("year")!) : null;

  if (!METRIC_COLUMNS[metric]) {
    return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
  }

  const conditions = [];

  if (siteId !== null) {
    conditions.push(eq(flights.siteId, siteId));
  }
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
  if (dateFrom) conditions.push(gte(flights.flightDate, dateFrom));
  if (dateTo) conditions.push(lte(flights.flightDate, dateTo));
  if (gliderCategory) conditions.push(eq(flights.gliderCategory, gliderCategory));
  if (year !== null) conditions.push(eq(flights.flightYear, year));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const aggSql = getAggregationSql(metric, aggregation);

  const result = await db
    .select({
      period: sql<string>`to_char(${flights.flightDate}::date, 'YYYY-MM')`.as("period"),
      value: sql<number>`${aggSql}`.as("value"),
      flightCount: sql<number>`count(*)`.as("flight_count"),
    })
    .from(flights)
    .where(where)
    .groupBy(sql`to_char(${flights.flightDate}::date, 'YYYY-MM')`)
    .orderBy(sql`period`);

  return NextResponse.json(result);
}
