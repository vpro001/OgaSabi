-- Data-integrity rules Prisma cannot express: CHECK constraints, partial unique indexes and
-- append-only triggers. Application code validates the same rules with Zod; these are the last line.

-- Users: must be reachable by email or phone, unless deleted/anonymised.
ALTER TABLE "users" ADD CONSTRAINT "users_contact_chk"
  CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL OR "deletedAt" IS NOT NULL OR "anonymizedAt" IS NOT NULL);
ALTER TABLE "users" ADD CONSTRAINT "users_failed_login_chk" CHECK ("failedLoginCount" >= 0);

-- Artisan profiles.
ALTER TABLE "artisan_profiles"
  ADD CONSTRAINT "artisan_profiles_lat_chk" CHECK ("lat" IS NULL OR "lat" BETWEEN -90 AND 90),
  ADD CONSTRAINT "artisan_profiles_lng_chk" CHECK ("lng" IS NULL OR "lng" BETWEEN -180 AND 180),
  ADD CONSTRAINT "artisan_profiles_radius_chk" CHECK ("serviceRadiusKm" BETWEEN 1 AND 200),
  ADD CONSTRAINT "artisan_profiles_callout_chk"
    CHECK (("calloutMinKobo" IS NULL OR "calloutMinKobo" >= 0)
       AND ("calloutMaxKobo" IS NULL OR "calloutMaxKobo" >= 0)
       AND ("calloutMinKobo" IS NULL OR "calloutMaxKobo" IS NULL OR "calloutMinKobo" <= "calloutMaxKobo")),
  ADD CONSTRAINT "artisan_profiles_trust_chk" CHECK ("trustScore" BETWEEN 0 AND 100),
  ADD CONSTRAINT "artisan_profiles_experience_chk" CHECK ("yearsExperience" BETWEEN 0 AND 80),
  ADD CONSTRAINT "artisan_profiles_rating_chk" CHECK ("ratingAverage" IS NULL OR "ratingAverage" BETWEEN 1 AND 5);

-- Weekly availability.
ALTER TABLE "availability_slots"
  ADD CONSTRAINT "availability_slots_day_chk" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "availability_slots_range_chk"
    CHECK ("startMinute" BETWEEN 0 AND 1439 AND "endMinute" BETWEEN 1 AND 1440 AND "endMinute" > "startMinute");

-- Service requests.
ALTER TABLE "service_requests"
  ADD CONSTRAINT "service_requests_lat_chk" CHECK ("lat" BETWEEN -90 AND 90),
  ADD CONSTRAINT "service_requests_lng_chk" CHECK ("lng" BETWEEN -180 AND 180),
  ADD CONSTRAINT "service_requests_schedule_chk" CHECK ("isImmediate" OR "scheduledFor" IS NOT NULL),
  ADD CONSTRAINT "service_requests_amounts_chk"
    CHECK (("quotedAmountKobo" IS NULL OR "quotedAmountKobo" > 0)
       AND ("finalAmountKobo" IS NULL OR "finalAmountKobo" >= 0)
       AND ("calloutFeeKobo" IS NULL OR "calloutFeeKobo" >= 0)),
  ADD CONSTRAINT "service_requests_cancel_chk"
    CHECK ("status" <> 'CANCELLED' OR ("cancelledAt" IS NOT NULL AND "cancelledByRole" IS NOT NULL));

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_amount_chk" CHECK ("amountKobo" > 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_chk" CHECK ("amountKobo" > 0);

-- Reviews.
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_chk" CHECK ("rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "reviews_weight_chk" CHECK ("trustWeight" BETWEEN 0 AND 1);

-- A complaint cannot be filed against yourself.
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_not_self_chk" CHECK ("filedById" <> "againstUserId");

-- Evidence belongs to exactly one of complaint / dispute.
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_owner_chk"
  CHECK (num_nonnulls("complaintId", "disputeId") = 1);

-- A report targets exactly one thing, matching its declared type.
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_chk"
  CHECK (num_nonnulls("targetUserId", "targetReviewId", "targetMessageId") = 1
     AND (("targetType" = 'USER' AND "targetUserId" IS NOT NULL)
       OR ("targetType" = 'REVIEW' AND "targetReviewId" IS NOT NULL)
       OR ("targetType" = 'MESSAGE' AND "targetMessageId" IS NOT NULL)));

-- Partial unique indexes: one pending verification per artisan, one live dispute per request,
-- one pending quote per request.
CREATE UNIQUE INDEX "identity_verifications_one_pending_idx"
  ON "identity_verifications" ("artisanId") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "disputes_one_open_per_request_idx"
  ON "disputes" ("requestId") WHERE "status" IN ('OPEN', 'UNDER_REVIEW');
CREATE UNIQUE INDEX "quotes_one_pending_per_request_idx"
  ON "quotes" ("requestId") WHERE "status" = 'PENDING';

-- Append-only tables: the request event history (read by the trust engine) and the audit log.
CREATE FUNCTION ogasabi_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: table is append-only', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "request_events_append_only"
  BEFORE UPDATE OR DELETE ON "request_events"
  FOR EACH ROW EXECUTE FUNCTION ogasabi_reject_mutation();

CREATE TRIGGER "audit_logs_append_only"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION ogasabi_reject_mutation();
