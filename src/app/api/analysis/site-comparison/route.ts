import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flights, sites } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
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

  const siteIds = params.get("siteIds")?.split(",").map(Number) ?? [];
  const metric = (params.get("metric") ?? "alt_gain") as Metric;
  const aggregation = (params.get("aggregation") ?? "mean") as Aggregation;
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const gliderCategory = params.get("gliderCategory");

  if (siteIds.length === 0 || siteIds.length > 4) {
    return NextResponse.json(
      { error: "Provide 1-4 siteIds (comma-separated)" },
      { status: 400 }
    );
  }

  if (!METRIC_COLUMNS[metric]) {
    return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
  }

  const conditions = [inArray(flights.siteId, siteIds)];
  if (dateFrom) conditions.push(gte(flights.flightDate, dateFrom));
  if (dateTo) conditions.push(lte(flights.flightDate, dateTo));
  if (gliderCategory) conditions.push(eq(flights.gliderCategory, gliderCategory));

  const aggSql = getAggregationSql(metric, aggregation);

  const result = await db
    .select({
      siteId: flights.siteId,
      siteName: sites.name,
      period: sql<string>`to_char(${flights.flightDate}::date, 'YYYY-MM')`.as("period"),
      value: sql<number>`${aggSql}`.as("value"),
      flightCount: sql<number>`count(*)`.as("flight_count"),
    })
    .from(flights)
    .innerJoin(sites, eq(flights.siteId, sites.id))
    .where(and(...conditions))
    .groupBy(flights.siteId, sites.name, sql`to_char(${flights.flightDate}::date, 'YYYY-MM')`)
    .orderBy(sql`${flights.siteId}`, sql`period`);

  // Group by site for easier frontend consumption
  const grouped: Record<
    number,
    { siteId: number; siteName: string; data: { period: string; value: number; flightCount: number }[] }
  > = {};

  for (const row of result) {
    const sid = row.siteId!;
    if (!grouped[sid]) {
      grouped[sid] = { siteId: sid, siteName: row.siteName!, data: [] };
    }
    grouped[sid].data.push({
      period: row.period,
      value: row.value,
      flightCount: row.flightCount,
    });
  }

  return NextResponse.json(Object.values(grouped));
}
