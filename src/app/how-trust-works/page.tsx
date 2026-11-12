import Link from "next/link";
import { Shell, PageHeader } from "@/components/site/shell";
import { Prose } from "@/components/site/prose";
import { buttonVariants } from "@/components/ui/button";
import { FORMULA_VERSION, MAX_POINTS, PROVISIONAL_BELOW_JOBS } from "@/server/trust/formula";
import { TRUST_COMPONENT } from "@/lib/format";

export const metadata = {
  title: "How the trust score works",
  description:
    "Exactly how OgaSabi calculates an artisan's trust score out of 100, and what raises or lowers it.",
};

const DETAIL: Record<string, string> = {
  verification:
    "0 with no ID, 8 once a government ID is approved, 12 with a matching selfie, 15 after an in-person review.",
  ratings:
    "A weighted average of reviews. New artisans start from an assumed 3.8 stars, so one 5-star review cannot buy the top score. 3.0 stars or below earns nothing; 5.0 earns all 30.",
  reliability:
    "Completed jobs compared with jobs the artisan cancelled after accepting and requests they never answered. Declining promptly does not count against them.",
  experience:
    "Grows quickly at first and then levels off: about 5 points at 10 jobs, 9.5 at 25, 13 at 50.",
  responsiveness:
    "Typical time to first answer a request: 10 points within 5 minutes, 8 within 15, 6 within an hour, 3 within four hours.",
  loyalty:
    "The share of completed jobs from customers who had hired the artisan before. Full points at 30%.",
  recency: "5 points for a completed job in the last 30 days, 3 within 90 days, 1 within 180.",
};

const TIERS = [
  {
    name: "New",
    rule: `Fewer than ${PROVISIONAL_BELOW_JOBS} completed jobs, or a score below 50. Shown as provisional.`,
    cls: "bg-tier-new",
  },
  { name: "Trusted", rule: "Score of 50 or more.", cls: "bg-tier-trusted" },
  { name: "Highly trusted", rule: "Score of 70 or more.", cls: "bg-tier-highly-trusted" },
  {
    name: "Top rated",
    rule: "Score of 85 or more and at least 20 completed jobs.",
    cls: "bg-tier-top-rated",
  },
];

export default function HowTrustWorksPage() {
  return (
    <Shell width="narrow">
      <PageHeader
        eyebrow={`Formula ${FORMULA_VERSION}`}
        title="How the trust score works"
        description="Every artisan has a score out of 100. It is calculated the same way for everyone, from things that actually happened on OgaSabi. Nobody can pay to change it."
      />
      <ol className="space-y-3">
        {Object.entries(MAX_POINTS).map(([key, max]) => (
          <li key={key} className="flex gap-4 p-4 card-surface">
            <span className="w-14 shrink-0 text-center">
              <span className="block font-headline text-3xl font-black text-primary tabular-nums">
                {max}
              </span>
              <span className="font-label text-[10px] font-bold text-muted-foreground uppercase">
                points
              </span>
            </span>
            <div>
              <h2 className="font-bold">{TRUST_COMPONENT[key]?.label}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{DETAIL[key]}</p>
            </div>
          </li>
        ))}
      </ol>
      <Prose>
        <h2>What lowers a score</h2>
        <ul>
          <li>
            <strong>Upheld complaints.</strong> When our team upholds a complaint, points come off
            according to how serious it was: 2 (low), 4 (medium), 8 (high) or 15 (critical, such as
            unsafe work or fraud).
          </li>
          <li>
            <strong>Lost disputes.</strong> 6 points when a dispute is decided for the customer, 3
            for a split decision.
          </li>
          <li>
            <strong>Time heals, slowly.</strong> Each deduction halves every 180 days, so an old
            mistake matters less than a recent one but does not vanish overnight.
          </li>
        </ul>
        <h2>The four tiers</h2>
      </Prose>
      <ul className="mt-4 space-y-2">
        {TIERS.map((t) => (
          <li key={t.name} className="flex items-center gap-3 rounded-xl border p-3">
            <span className={`size-3 shrink-0 rounded-none ${t.cls}`} aria-hidden />
            <span className="w-32 shrink-0 font-bold">{t.name}</span>
            <span className="text-sm text-muted-foreground">{t.rule}</span>
          </li>
        ))}
      </ul>
      <Prose>
        <h2>How we keep it honest</h2>
        <ul>
          <li>
            A review can only be written by the customer of a job that was confirmed complete, once
            per job.
          </li>
          <li>
            Several reviews from the same customer for the same artisan in a short period count for
            half.
          </li>
          <li>Reviews hidden for breaking the rules stop counting.</li>
          <li>
            Every recalculation is stored with the numbers it was based on, so a score can always be
            explained.
          </li>
          <li>
            Scores are recalculated after each completed job, review, cancellation, verification
            change and decision, and again every night.
          </li>
        </ul>
        <h2>For artisans: how to raise your score</h2>
        <ol>
          <li>Verify your identity. It is the fastest 8 to 12 points you can earn.</li>
          <li>
            Answer every request quickly, even if the answer is “no”. Declining is free; ignoring is
            not.
          </li>
          <li>Only accept jobs you can do. Cancelling after accepting costs reliability points.</li>
          <li>Ask happy customers to confirm completion and leave a review.</li>
        </ol>
      </Prose>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/search" className={buttonVariants({ variant: "accent" })}>
          Find an artisan
        </Link>
        <Link href="/artisan" className={buttonVariants({ variant: "outline" })}>
          I am an artisan
        </Link>
      </div>
    </Shell>
  );
}
