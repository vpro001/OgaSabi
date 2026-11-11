// OgaSabi trust score, formula v1. A pure function of counted facts, so every score can be
// explained and reproduced from its stored inputs (see docs/trust-score.md).

export const FORMULA_VERSION = "v1";

export type TrustTierName = "NEW" | "TRUSTED" | "HIGHLY_TRUSTED" | "TOP_RATED";
export type VerificationLevelName =
  "NONE" | "ID_VERIFIED" | "ID_SELFIE_VERIFIED" | "ADMIN_REVIEWED";
export type SeverityName = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TrustInputs = {
  verificationLevel: VerificationLevelName;
  completedJobs: number;
  /** Jobs the artisan cancelled after accepting. */
  artisanCancellations: number;
  /** Requests that expired because the artisan never answered. */
  expiredRequests: number;
  /** Published reviews: rating 1-5 and a manipulation weight in [0,1]. */
  reviews: { rating: number; weight: number }[];
  /** Median seconds from request to the artisan's first response, or null with no history. */
  medianResponseSec: number | null;
  /** Completed jobs that came from a customer who had hired this artisan before. */
  repeatCustomerJobs: number;
  daysSinceLastCompletedJob: number | null;
  upheldComplaints: { severity: SeverityName; ageDays: number }[];
  /** Disputes resolved for the customer (full weight) or split (half weight). */
  lostDisputes: { weight: number; ageDays: number }[];
};

export type TrustComponents = {
  verification: number;
  ratings: number;
  reliability: number;
  experience: number;
  responsiveness: number;
  loyalty: number;
  recency: number;
  penalties: number;
};

export type TrustResult = {
  score: number;
  tier: TrustTierName;
  isProvisional: boolean;
  components: TrustComponents;
  ratingAverage: number | null;
  ratingCount: number;
  completionRate: number | null;
};

export const MAX_POINTS: Omit<TrustComponents, "penalties"> = {
  verification: 15,
  ratings: 30,
  reliability: 20,
  experience: 15,
  responsiveness: 10,
  loyalty: 5,
  recency: 5,
};

const VERIFICATION_POINTS: Record<VerificationLevelName, number> = {
  NONE: 0,
  ID_VERIFIED: 8,
  ID_SELFIE_VERIFIED: 12,
  ADMIN_REVIEWED: 15,
};

const COMPLAINT_PENALTY: Record<SeverityName, number> = {
  LOW: 2,
  MEDIUM: 4,
  HIGH: 8,
  CRITICAL: 15,
};
const DISPUTE_PENALTY = 6;
const PENALTY_HALF_LIFE_DAYS = 180;
// Bayesian prior: a new artisan is assumed to be a 3.8-star artisan until 5 reviews say otherwise.
const PRIOR_MEAN = 3.8;
const PRIOR_WEIGHT = 5;
/** Below this many completed jobs the score is shown as provisional and the tier stays NEW. */
export const PROVISIONAL_BELOW_JOBS = 3;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const decay = (ageDays: number) => Math.pow(0.5, Math.max(0, ageDays) / PENALTY_HALF_LIFE_DAYS);

export function tierFor(score: number, completedJobs: number): TrustTierName {
  if (completedJobs < PROVISIONAL_BELOW_JOBS) return "NEW";
  if (score >= 85 && completedJobs >= 20) return "TOP_RATED";
  if (score >= 70) return "HIGHLY_TRUSTED";
  if (score >= 50) return "TRUSTED";
  return "NEW";
}

export function computeTrust(input: TrustInputs): TrustResult {
  const published = input.reviews.filter((r) => r.weight > 0);
  const weightSum = published.reduce((s, r) => s + r.weight, 0);
  const weightedRating = published.reduce((s, r) => s + r.rating * r.weight, 0);
  const bayes = (PRIOR_MEAN * PRIOR_WEIGHT + weightedRating) / (PRIOR_WEIGHT + weightSum);
  // 3.0 stars and below earn nothing; 5.0 earns the full 30.
  const ratings = clamp((bayes - 3) / 2, 0, 1) * MAX_POINTS.ratings;

  const attempts = input.completedJobs + input.artisanCancellations + input.expiredRequests;
  // Two "prior" jobs at 80% keep a single early cancellation from zeroing the component.
  const smoothedRate = (input.completedJobs + 1.6) / (attempts + 2);
  const reliability = clamp((smoothedRate - 0.5) / 0.5, 0, 1) * MAX_POINTS.reliability;

  const experience = (1 - Math.exp(-input.completedJobs / 25)) * MAX_POINTS.experience;

  const sec = input.medianResponseSec;
  const responsiveness =
    sec == null ? 5 : sec <= 300 ? 10 : sec <= 900 ? 8 : sec <= 3600 ? 6 : sec <= 4 * 3600 ? 3 : 1;

  const loyalty =
    input.completedJobs > 0
      ? clamp(input.repeatCustomerJobs / input.completedJobs / 0.3, 0, 1) * MAX_POINTS.loyalty
      : 0;

  const days = input.daysSinceLastCompletedJob;
  const recency = days == null ? 0 : days <= 30 ? 5 : days <= 90 ? 3 : days <= 180 ? 1 : 0;

  const penalties =
    input.upheldComplaints.reduce(
      (s, c) => s + COMPLAINT_PENALTY[c.severity] * decay(c.ageDays),
      0,
    ) + input.lostDisputes.reduce((s, d) => s + DISPUTE_PENALTY * d.weight * decay(d.ageDays), 0);

  const components: TrustComponents = {
    verification: VERIFICATION_POINTS[input.verificationLevel],
    ratings: round1(ratings),
    reliability: round1(reliability),
    experience: round1(experience),
    responsiveness,
    loyalty: round1(loyalty),
    recency,
    penalties: round1(penalties),
  };
  const positive =
    components.verification +
    components.ratings +
    components.reliability +
    components.experience +
    components.responsiveness +
    components.loyalty +
    components.recency;
  const score = round1(clamp(positive - components.penalties, 0, 100));

  const plain = input.reviews;
  return {
    score,
    tier: tierFor(score, input.completedJobs),
    isProvisional: input.completedJobs < PROVISIONAL_BELOW_JOBS,
    components,
    ratingAverage: plain.length
      ? Math.round((plain.reduce((s, r) => s + r.rating, 0) / plain.length) * 100) / 100
      : null,
    ratingCount: plain.length,
    completionRate:
      attempts > 0 ? Math.round((input.completedJobs / attempts) * 1000) / 1000 : null,
  };
}
