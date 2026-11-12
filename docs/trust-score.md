# Trust score (formula v1)

Source of truth: `src/server/trust/formula.ts` (pure function, unit-tested in `tests/unit/trust.test.ts`).
The public explanation is the `/how-trust-works` page, which reads its numbers from the same file.

Score = sum of seven components (max 100) minus penalties, clamped to 0..100.

| Component      | Max | How it is earned                                                                                    |
| -------------- | --- | --------------------------------------------------------------------------------------------------- |
| verification   | 15  | NONE 0, ID_VERIFIED 8, ID_SELFIE_VERIFIED 12, ADMIN_REVIEWED 15                                     |
| ratings        | 30  | Bayesian mean of published reviews (prior 3.8 stars with weight 5); 3.0 → 0, 5.0 → 30               |
| reliability    | 20  | completed / (completed + artisan cancellations + unanswered expiries), smoothed; 50% → 0, 100% → 20 |
| experience     | 15  | `15 × (1 − e^(−completed/25))`                                                                      |
| responsiveness | 10  | median first response: ≤5 min 10, ≤15 min 8, ≤1 h 6, ≤4 h 3, slower 1, no history 5                 |
| loyalty        | 5   | share of completed jobs from repeat customers; full marks at 30%                                    |
| recency        | 5   | last completed job ≤30 days 5, ≤90 days 3, ≤180 days 1                                              |

Penalties: upheld complaints LOW 2 / MEDIUM 4 / HIGH 8 / CRITICAL 15; disputes lost 6 (split 3). Each halves every 180 days.

Tiers: fewer than 3 completed jobs is always `NEW` and shown as provisional. Otherwise ≥85 with ≥20 jobs `TOP_RATED`, ≥70 `HIGHLY_TRUSTED`, ≥50 `TRUSTED`.

Anti-manipulation: one review per completed request (database unique index); a customer's 4th+ review of the same artisan within 90 days gets `trustWeight` 0.5; hidden reviews stop counting.

Every recomputation writes a `trust_score_snapshots` row (components, inputs, formula version, trigger) and refreshes the denormalised columns on `artisan_profiles`. Triggers: job confirmed, artisan cancellation, review, verification decision, complaint/dispute decision, and the nightly job (`POST /api/v1/cron/trust`).

Changing the formula: bump `FORMULA_VERSION`, update this file, and run the nightly job once so every profile is rescored.
