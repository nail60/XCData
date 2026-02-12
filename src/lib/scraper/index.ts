import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { flights, scrapeJobs, sites } from "../db/schema";
import { XContestScraper, type ScrapedFlight } from "./xcontest";
import { haversineDistance } from "./parser";
import type { ScrapeOptions } from "../../types";

export async function runScrapeJob(options: ScrapeOptions): Promise<void> {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const scraper = new XContestScraper({
    delayMs: options.delayMs ?? 3000,
    headless: true,
  });

  // Create scrape job record
  const [job] = await db
    .insert(scrapeJobs)
    .values({
      region: options.region ?? `${options.lat},${options.lng} r=${options.radius}km`,
      status: "running",
      dateFrom: options.from,
      dateTo: options.to,
    })
    .returning();

  console.log(`Scrape job #${job.id} started`);
  let totalFlights = 0;

  try {
    await scraper.init();

    const fromDate = new Date(options.from);
    const toDate = new Date(options.to);

    // Iterate by year
    for (let year = fromDate.getFullYear(); year <= toDate.getFullYear(); year++) {
      console.log(`\nScraping year ${year}...`);
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const scrapedFlights = await scraper.scrapeFlightListings(
          year,
          options.country ?? "US",
          options.region,
          page
        );

        if (scrapedFlights.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`  Page ${page}: found ${scrapedFlights.length} flights`);

        // Process and filter by radius
        let stored = 0;
        for (const sf of scrapedFlights) {
          const flightRecord = await processScrapedFlight(db, sf, options, scraper);
          if (flightRecord) stored++;
        }

        totalFlights += stored;
        console.log(`  Stored ${stored} flights within radius`);

        page++;
        if (scrapedFlights.length < 100) hasMore = false;
      }
    }

    // Update job as completed
    await db
      .update(scrapeJobs)
      .set({
        status: "completed",
        flightsFound: totalFlights,
        completedAt: new Date(),
      })
      .where(eq(scrapeJobs.id, job.id));

    console.log(`\nScrape job #${job.id} completed. Total flights stored: ${totalFlights}`);
  } catch (err) {
    await db
      .update(scrapeJobs)
      .set({
        status: "failed",
        error: (err as Error).message,
        flightsFound: totalFlights,
        completedAt: new Date(),
      })
      .where(eq(scrapeJobs.id, job.id));

    console.error("Scrape job failed:", err);
    throw err;
  } finally {
    await scraper.close();
    await client.end();
  }
}

async function processScrapedFlight(
  db: ReturnType<typeof drizzle>,
  sf: ScrapedFlight,
  options: ScrapeOptions,
  scraper: XContestScraper
): Promise<boolean> {
  if (!sf.id) return false;

  // Check if flight already exists
  const existing = await db.select({ id: flights.id }).from(flights).where(eq(flights.xcontestId, sf.id)).limit(1);
  if (existing.length > 0) return false;

  // Get flight detail for coordinates and altitude
  const detail = sf.url ? await scraper.scrapeFlightDetail(sf.url) : null;

  if (!detail || (detail.launchLat === 0 && detail.launchLng === 0)) {
    return false;
  }

  // Filter by radius from target location
  const dist = haversineDistance(options.lat, options.lng, detail.launchLat, detail.launchLng);
  if (dist > options.radius) return false;

  // Parse date
  const dateStr = parseDate(sf.dateStr ?? "");
  if (!dateStr) return false;

  const dateParts = dateStr.split("-");
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]);

  // Parse numeric fields
  const distance = parseFloat(sf.distanceStr ?? "") || null;
  const points = parseFloat(sf.pointsStr ?? "") || null;
  const durationMin = parseDurationToMin(sf.durationStr ?? "");

  // Find or create site
  const siteId = await findOrCreateSite(db, detail.launchLat, detail.launchLng, sf.launchName, detail.launchAlt);

  const altGain =
    detail.altGain ?? (detail.maxAlt && detail.launchAlt ? detail.maxAlt - detail.launchAlt : null);

  await db.insert(flights).values({
    xcontestId: sf.id,
    siteId,
    pilotName: sf.pilotName,
    launchLat: detail.launchLat,
    launchLng: detail.launchLng,
    launchAltM: detail.launchAlt,
    maxAltM: detail.maxAlt,
    altGainM: altGain,
    distanceKm: distance,
    xcontestPoints: points,
    durationMin: durationMin,
    gliderCategory: sf.gliderCategory,
    flightDate: dateStr,
    flightYear: year,
    flightMonth: month,
    routeType: sf.routeType,
    xcontestUrl: sf.url,
  });

  return true;
}

async function findOrCreateSite(
  db: ReturnType<typeof drizzle>,
  lat: number,
  lng: number,
  name: string | null,
  elevation: number | null
): Promise<number> {
  // Look for an existing site within ~500m
  const allSites = await db.select().from(sites);
  for (const site of allSites) {
    const dist = haversineDistance(lat, lng, site.lat, site.lng);
    if (dist < 0.5) return site.id;
  }

  // Create new site
  const [newSite] = await db
    .insert(sites)
    .values({
      name: name ?? `Site at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat,
      lng,
      elevationM: elevation,
    })
    .returning();

  return newSite.id;
}

function parseDate(raw: string): string | null {
  // YYYY-MM-DD
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  // DD.MM.YYYY
  const dmy = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // DD/MM/YYYY
  const slash = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;

  return null;
}

function parseDurationToMin(raw: string): number | null {
  // HH:MM:SS
  const hms = raw.match(/(\d+):(\d+):(\d+)/);
  if (hms) return Math.round(parseInt(hms[1]) * 60 + parseInt(hms[2]) + parseInt(hms[3]) / 60);

  // HH:MM
  const hm = raw.match(/(\d+):(\d+)/);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);

  // Just minutes
  const min = parseFloat(raw);
  if (!isNaN(min)) return Math.round(min);

  return null;
}
