import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sites, flights } from "../src/lib/db/schema";

async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  console.log("Seeding database...");

  // Bay Area flying sites
  const siteData = [
    { name: "Mt Tamalpais", lat: 37.9235, lng: -122.5965, elevationM: 784, country: "US", region: "California" },
    { name: "Ed Levin Park", lat: 37.4627, lng: -121.8613, elevationM: 686, country: "US", region: "California" },
    { name: "Mission Peak", lat: 37.5126, lng: -121.8807, elevationM: 762, country: "US", region: "California" },
    { name: "Mussel Rock", lat: 37.6714, lng: -122.4939, elevationM: 46, country: "US", region: "California" },
    { name: "Fort Funston", lat: 37.7136, lng: -122.5028, elevationM: 61, country: "US", region: "California" },
  ];

  const insertedSites = await db.insert(sites).values(siteData).returning();
  console.log(`Inserted ${insertedSites.length} sites`);

  // Sample flights
  const flightData = insertedSites.flatMap((site) => {
    const flightsForSite = [];
    for (let month = 1; month <= 12; month++) {
      const count = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < count; i++) {
        const launchAlt = site.elevationM ?? 100;
        const altGain = Math.floor(Math.random() * 1500) + 100;
        const day = Math.floor(Math.random() * 28) + 1;
        flightsForSite.push({
          xcontestId: `seed-${site.id}-${month}-${i}`,
          siteId: site.id,
          pilotName: `Pilot ${Math.floor(Math.random() * 20) + 1}`,
          pilotCountry: "US",
          launchLat: site.lat + (Math.random() - 0.5) * 0.01,
          launchLng: site.lng + (Math.random() - 0.5) * 0.01,
          launchAltM: launchAlt,
          maxAltM: launchAlt + altGain,
          altGainM: altGain,
          totalAltGainM: altGain + Math.floor(Math.random() * 500),
          distanceKm: Math.round((Math.random() * 50 + 2) * 10) / 10,
          fivePointDistanceKm: Math.round((Math.random() * 40 + 1) * 10) / 10,
          xcontestPoints: Math.round((Math.random() * 100 + 5) * 10) / 10,
          durationMin: Math.floor(Math.random() * 180) + 15,
          avgSpeedKmh: Math.round((Math.random() * 30 + 10) * 10) / 10,
          gliderCategory: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
          flightDate: `2024-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          flightYear: 2024,
          flightMonth: month,
          routeType: ["free_flight", "flat_triangle", "fai_triangle", "free_flight"][Math.floor(Math.random() * 4)],
          xcontestUrl: `https://www.xcontest.org/world/en/flights/detail:seed-${site.id}-${month}-${i}`,
        });
      }
    }
    return flightsForSite;
  });

  const insertedFlights = await db.insert(flights).values(flightData).returning();
  console.log(`Inserted ${insertedFlights.length} flights`);

  await client.end();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
