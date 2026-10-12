-- Extensions that must exist before the baseline tables/indexes.
-- pg_trgm powers fuzzy artisan/business-name search (trigram GIN index in the baseline).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
