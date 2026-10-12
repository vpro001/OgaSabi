-- Geospatial index for artisan search (ADR-004).
--
-- When PostGIS is available we add a `location` geography(Point,4326) column that is *generated*
-- from lat/lng (so the app only ever writes lat/lng) and a GiST index for ST_DWithin/KNN queries.
-- When it is not available (some shared hosts) the migration is a no-op and the search service
-- falls back to a bounding-box prefilter on the ("status","lat","lng") btree index plus Haversine.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
    CREATE EXTENSION IF NOT EXISTS postgis;

    ALTER TABLE "artisan_profiles"
      ADD COLUMN IF NOT EXISTS "location" geography(Point,4326)
      GENERATED ALWAYS AS (
        CASE
          WHEN "lat" IS NOT NULL AND "lng" IS NOT NULL
          THEN ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography
        END
      ) STORED;

    CREATE INDEX IF NOT EXISTS "artisan_profiles_location_gist_idx"
      ON "artisan_profiles" USING GIST ("location");
  ELSE
    RAISE NOTICE 'PostGIS is not available: geo search will use the bounding-box + Haversine fallback.';
  END IF;
END
$$;
