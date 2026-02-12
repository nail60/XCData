import { runScrapeJob } from "../src/lib/scraper";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function main() {
  const args = parseArgs();

  const lat = parseFloat(args.lat ?? "37.7749");
  const lng = parseFloat(args.lng ?? "-122.4194");
  const radius = parseFloat(args.radius ?? "100");
  const from = args.from ?? "2024-01-01";
  const to = args.to ?? "2025-12-31";
  const country = args.country ?? "US";
  const region = args.region;
  const delayMs = parseInt(args.delay ?? "3000");

  console.log("XContest Scraper");
  console.log("================");
  console.log(`Target: ${lat}, ${lng} (radius: ${radius}km)`);
  console.log(`Date range: ${from} to ${to}`);
  console.log(`Country: ${country}${region ? `, Region: ${region}` : ""}`);
  console.log(`Delay between requests: ${delayMs}ms`);
  console.log("");

  await runScrapeJob({ lat, lng, radius, from, to, country, region, delayMs });
}

main().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
