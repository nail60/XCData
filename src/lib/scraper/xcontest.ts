import { chromium, type Browser, type Page } from "playwright";

export interface XContestScraperConfig {
  delayMs: number;
  maxRetries: number;
  headless: boolean;
}

const DEFAULT_CONFIG: XContestScraperConfig = {
  delayMs: 3000,
  maxRetries: 3,
  headless: true,
};

export class XContestScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: XContestScraperConfig;

  constructor(config: Partial<XContestScraperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
    });
    const context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    });
    this.page = await context.newPage();
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }

  /**
   * Scrape flight listings from XContest for a given filter URL.
   * XContest flight listing pages load data via JS. We intercept
   * the rendered DOM to extract flight table rows.
   */
  async scrapeFlightListings(
    year: number,
    country: string,
    region?: string,
    page: number = 0
  ): Promise<ScrapedFlight[]> {
    if (!this.page) throw new Error("Scraper not initialized. Call init() first.");

    // Build the XContest URL for flight listings
    // Format: https://www.xcontest.org/world/en/flights-search/?filter[point]=...
    const baseUrl = `https://www.xcontest.org/${year > 2020 ? "world" : "world"}/en/flights-search/`;
    const params = new URLSearchParams();

    if (country) params.set("filter[country]", country);
    if (region) params.set("filter[region]", region);
    params.set("filter[date_mode]", "dmy");

    const offset = page * 100;
    if (offset > 0) params.set("list[start]", String(offset));
    params.set("list[num]", "100");

    const url = `${baseUrl}?${params.toString()}`;
    console.log(`Scraping: ${url}`);

    let retries = 0;
    while (retries < this.config.maxRetries) {
      try {
        await this.page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        await this.delay(this.config.delayMs);

        // Extract flights from the rendered table
        const flights = await this.page.evaluate(() => {
          const rows = document.querySelectorAll("table.flights tbody tr, table.XClist tbody tr");
          const results: Array<Record<string, string>> = [];

          rows.forEach((row) => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 5) return;

            const link = row.querySelector("a[href*='/flights/detail:']") as HTMLAnchorElement;
            const flightUrl = link?.href ?? "";
            const idMatch = flightUrl.match(/detail:([^/]+)/);

            results.push({
              id: idMatch?.[1] ?? "",
              url: flightUrl,
              pilot: row.querySelector(".plt, .pilot")?.textContent?.trim() ?? "",
              date: row.querySelector(".date, td:first-child")?.textContent?.trim() ?? "",
              launch: row.querySelector(".lau, .launch")?.textContent?.trim() ?? "",
              distance: row.querySelector(".km, .distance")?.textContent?.trim() ?? "",
              points: row.querySelector(".pts, .points")?.textContent?.trim() ?? "",
              duration: row.querySelector(".dur, .duration, .time")?.textContent?.trim() ?? "",
              glider: row.querySelector(".gld, .glider")?.textContent?.trim() ?? "",
              type: row.querySelector(".typ, .route, .type")?.textContent?.trim() ?? "",
            });
          });

          return results;
        });

        return flights
          .filter((f) => f.id)
          .map((f) => ({
            id: f.id,
            url: f.url,
            pilotName: f.pilot || null,
            dateStr: f.date || null,
            launchName: f.launch || null,
            distanceStr: f.distance || null,
            pointsStr: f.points || null,
            durationStr: f.duration || null,
            gliderCategory: f.glider || null,
            routeType: f.type || null,
          }));
      } catch (err) {
        retries++;
        console.warn(`Retry ${retries}/${this.config.maxRetries} for ${url}:`, (err as Error).message);
        await this.delay(this.config.delayMs * 2);
      }
    }

    console.error(`Failed to scrape ${url} after ${this.config.maxRetries} retries`);
    return [];
  }

  /**
   * Scrape detailed flight info from an individual flight page.
   * This gets launch alt, max alt, and other details not in listings.
   */
  async scrapeFlightDetail(flightUrl: string): Promise<FlightDetail | null> {
    if (!this.page) throw new Error("Scraper not initialized. Call init() first.");

    try {
      await this.page.goto(flightUrl, { waitUntil: "networkidle", timeout: 30000 });
      await this.delay(this.config.delayMs);

      const detail = await this.page.evaluate(() => {
        const getText = (selector: string): string => {
          return document.querySelector(selector)?.textContent?.trim() ?? "";
        };

        // Try to extract coordinates from the map or flight data
        const launchLatLng = { lat: 0, lng: 0 };
        const scripts = document.querySelectorAll("script");
        for (const script of scripts) {
          const content = script.textContent ?? "";
          const coordMatch = content.match(/launch.*?(\d+\.\d+).*?(\d+\.\d+)/i);
          if (coordMatch) {
            launchLatLng.lat = parseFloat(coordMatch[1]);
            launchLatLng.lng = parseFloat(coordMatch[2]);
          }
        }

        // Extract stats from the detail panel
        const statsText = document.querySelector(".flight-info, .detail-info, .stats")?.textContent ?? "";
        const altMatch = statsText.match(/max[.\s]*alt[.\s:]*(\d+)\s*m/i);
        const launchAltMatch = statsText.match(/launch[.\s]*alt[.\s:]*(\d+)\s*m/i);
        const gainMatch = statsText.match(/alt[.\s]*gain[.\s:]*(\d+)\s*m/i);

        return {
          launchLat: launchLatLng.lat,
          launchLng: launchLatLng.lng,
          maxAlt: altMatch ? parseInt(altMatch[1]) : null,
          launchAlt: launchAltMatch ? parseInt(launchAltMatch[1]) : null,
          altGain: gainMatch ? parseInt(gainMatch[1]) : null,
          rawText: statsText.substring(0, 500),
        };
      });

      return detail;
    } catch (err) {
      console.warn(`Failed to get detail for ${flightUrl}:`, (err as Error).message);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export interface ScrapedFlight {
  id: string;
  url: string;
  pilotName: string | null;
  dateStr: string | null;
  launchName: string | null;
  distanceStr: string | null;
  pointsStr: string | null;
  durationStr: string | null;
  gliderCategory: string | null;
  routeType: string | null;
}

export interface FlightDetail {
  launchLat: number;
  launchLng: number;
  maxAlt: number | null;
  launchAlt: number | null;
  altGain: number | null;
  rawText: string;
}
