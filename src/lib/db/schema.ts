import {
  pgTable,
  serial,
  text,
  integer,
  real,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sites = pgTable(
  "sites",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    elevationM: integer("elevation_m"),
    country: text("country"),
    region: text("region"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sites_lat_lng_idx").on(table.lat, table.lng),
    index("sites_country_idx").on(table.country),
  ]
);

export const flights = pgTable(
  "flights",
  {
    id: serial("id").primaryKey(),
    xcontestId: text("xcontest_id").notNull(),
    siteId: integer("site_id").references(() => sites.id),
    pilotName: text("pilot_name"),
    pilotCountry: text("pilot_country"),
    launchLat: real("launch_lat").notNull(),
    launchLng: real("launch_lng").notNull(),
    launchAltM: integer("launch_alt_m"),
    maxAltM: integer("max_alt_m"),
    altGainM: integer("alt_gain_m"),
    totalAltGainM: integer("total_alt_gain_m"),
    distanceKm: real("distance_km"),
    fivePointDistanceKm: real("five_point_distance_km"),
    xcontestPoints: real("xcontest_points"),
    durationMin: integer("duration_min"),
    avgSpeedKmh: real("avg_speed_kmh"),
    gliderCategory: text("glider_category"),
    flightDate: date("flight_date").notNull(),
    flightYear: integer("flight_year").notNull(),
    flightMonth: integer("flight_month").notNull(),
    routeType: text("route_type"),
    xcontestUrl: text("xcontest_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("flights_xcontest_id_idx").on(table.xcontestId),
    index("flights_site_id_idx").on(table.siteId),
    index("flights_launch_lat_lng_idx").on(table.launchLat, table.launchLng),
    index("flights_date_idx").on(table.flightDate),
    index("flights_year_month_idx").on(table.flightYear, table.flightMonth),
    index("flights_glider_category_idx").on(table.gliderCategory),
  ]
);

export const scrapeJobs = pgTable("scrape_jobs", {
  id: serial("id").primaryKey(),
  region: text("region"),
  status: text("status").notNull().default("pending"),
  dateFrom: date("date_from"),
  dateTo: date("date_to"),
  flightsFound: integer("flights_found").default(0),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
