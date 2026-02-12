CREATE TABLE "flights" (
	"id" serial PRIMARY KEY NOT NULL,
	"xcontest_id" text NOT NULL,
	"site_id" integer,
	"pilot_name" text,
	"pilot_country" text,
	"launch_lat" real NOT NULL,
	"launch_lng" real NOT NULL,
	"launch_alt_m" integer,
	"max_alt_m" integer,
	"alt_gain_m" integer,
	"total_alt_gain_m" integer,
	"distance_km" real,
	"five_point_distance_km" real,
	"xcontest_points" real,
	"duration_min" integer,
	"avg_speed_kmh" real,
	"glider_category" text,
	"flight_date" date NOT NULL,
	"flight_year" integer NOT NULL,
	"flight_month" integer NOT NULL,
	"route_type" text,
	"xcontest_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"date_from" date,
	"date_to" date,
	"flights_found" integer DEFAULT 0,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"elevation_m" integer,
	"country" text,
	"region" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flights_xcontest_id_idx" ON "flights" USING btree ("xcontest_id");--> statement-breakpoint
CREATE INDEX "flights_site_id_idx" ON "flights" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "flights_launch_lat_lng_idx" ON "flights" USING btree ("launch_lat","launch_lng");--> statement-breakpoint
CREATE INDEX "flights_date_idx" ON "flights" USING btree ("flight_date");--> statement-breakpoint
CREATE INDEX "flights_year_month_idx" ON "flights" USING btree ("flight_year","flight_month");--> statement-breakpoint
CREATE INDEX "flights_glider_category_idx" ON "flights" USING btree ("glider_category");--> statement-breakpoint
CREATE INDEX "sites_lat_lng_idx" ON "sites" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "sites_country_idx" ON "sites" USING btree ("country");