import Link from "next/link";
import { Shell } from "@/components/site/shell";
import { HeroSearch } from "@/components/site/hero-search";
import { ArtisanCard } from "@/components/artisan/artisan-card";
import { CategoryIcon } from "@/components/artisan/category-icon";
import { Stamp, TrustGauge } from "@/components/artisan/trust";
import { buttonVariants } from "@/components/ui/button";
import { listCategories, platformStats, searchArtisans } from "@/server/services/artisans";
import { MAX_POINTS } from "@/server/trust/formula";
import { TRUST_COMPONENT } from "@/lib/format";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

async function loadHome() {
  try {
    const [stats, categories, top] = await Promise.all([
      platformStats(),
      listCategories(),
      searchArtisans({ sort: "trust", limit: 6, offset: 0 }),
    ]);
    return { stats, categories, artisans: top.artisans };
  } catch (err) {
    // The page still explains the product when the database is briefly unreachable.
    logger.error({ err }, "home page data failed to load");
    return { stats: null, categories: [], artisans: [] };
  }
}

const STEPS = [
  {
    title: "Say wetin spoil",
    body: "Describe the fault, add photos, and pick when you need someone.",
  },
  {
    title: "Check the meter",
    body: "Compare distance, callout fee, real reviews and what each trust score is made of.",
  },
  {
    title: "Agree price first",
    body: "The artisan accepts or sends a quote. Nothing is booked until you both agree.",
  },
  {
    title: "Confirm, then review",
    body: "You confirm the work is done. Only customers with a finished job can review.",
  },
];

const RULES = [
  {
    n: "A",
    title: "People check the ID",
    body: "Artisans submit government ID and a selfie. A person on our team reviews every one before the stamp appears.",
  },
  {
    n: "B",
    title: "Your address stays hidden",
    body: "Artisans see your area and a rounded distance until the job is accepted. Phone numbers are shared at the same moment.",
  },
  {
    n: "C",
    title: "No job, no review",
    body: "A review can only be written after a job is confirmed complete. One per job. Artisans can reply, never delete.",
  },
  {
    n: "D",
    title: "Wahala has a process",
    body: "Open a dispute within 48 hours and a person decides. Upheld complaints take points off the score, in public.",
  },
];

function SectionHead({
  index,
  title,
  aside,
}: {
  index: string;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 pb-4">
      <h2 className="flex items-start gap-3 text-h1">
        <span className="mt-1 bg-foreground px-1.5 py-1 font-label text-xs tracking-widest text-background">
          {index}
        </span>
        {title}
      </h2>
      {aside}
    </div>
  );
}

export default async function HomePage() {
  const { stats, categories, artisans } = await loadHome();
  const lead = artisans[0];
  const ticker = categories.length
    ? categories.map((c) => c.name)
    : ["Electrician", "Plumber", "AC technician", "Generator repair"];
  const statItems = stats
    ? [
        { value: stats.artisans.toLocaleString("en-NG"), label: "artisans on the board" },
        { value: stats.verified.toLocaleString("en-NG"), label: "ID checked by a person" },
        { value: stats.completedJobs.toLocaleString("en-NG"), label: "jobs confirmed done" },
        {
          value: String(stats.cities.length),
          label: stats.cities.length === 1 ? "city" : "cities",
        },
      ]
    : [];

  return (
    <Shell bare>
      {/* Ticker: the trades, running like the destination board on a bus. */}
      <div className="overflow-hidden border-b-2 bg-foreground py-2 text-background" aria-hidden>
        <div className="flex w-max animate-marquee gap-8 ticket-label">
          {[...ticker, ...ticker, ...ticker, ...ticker].map((name, i) => (
            <span key={i} className="flex items-center gap-8">
              {name} <span className="text-danfo">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative border-b-2">
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-12">
          <p className="ticket-label">
            <span className="bg-secondary px-1.5 py-1 text-secondary-foreground">Notice</span>{" "}
            &nbsp;Trust scores built from real, completed jobs
          </p>
          <h1 className="mt-5 text-display">
            Stop asking WhatsApp groups. Hire who{" "}
            <span className="gold-gradient-text">actually sabi</span> work.
          </h1>
        </div>
        <div className="mx-auto grid max-w-7xl items-end gap-10 px-4 pt-8 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:px-8">
          <div className="min-w-0">
            <p className="max-w-xl text-lg">
              Electricians, plumbers, AC and gen technicians near you. Each one carries a score out
              of 100 that you can open up and check: ID, finished jobs, reviews, how fast they
              answer.
            </p>
            <div className="mt-7 max-w-3xl">
              <HeroSearch />
            </div>
          </div>

          {/* The meter, shown with whoever tops the board right now. */}
          <aside className="relative">
            <div className="border-2 bg-ink p-5 text-paper shadow-xl lg:rotate-2">
              <p className="flex justify-between ticket-label text-danfo">
                <span>Trust meter</span>
                <span>{lead ? "Top of the board" : "0 – 100"}</span>
              </p>
              <TrustGauge
                score={lead?.trustScore ?? 82}
                tier={lead?.trustTier ?? "HIGHLY_TRUSTED"}
                onDark
                className="mt-3"
              />
              {lead && (
                <Link
                  href={`/artisans/${lead.id}`}
                  className="mt-4 block border-t-2 border-dashed border-paper/40 pt-3 hover:text-danfo"
                >
                  <span className="block font-headline text-xl leading-none">
                    {lead.businessName}
                  </span>
                  <span className="ticket-label opacity-70">
                    {lead.headline} · {lead.completedJobsCount} jobs →
                  </span>
                </Link>
              )}
            </div>
            <Stamp
              tone="signal"
              tilt={-12}
              className="absolute -top-4 -left-3 bg-background text-sm"
            >
              No paid ranking
            </Stamp>
          </aside>
        </div>

        {statItems.length > 0 && (
          <dl className="grid grid-cols-2 border-t-2 lg:grid-cols-4">
            {statItems.map((s, i) => (
              <div
                key={s.label}
                className={`flex items-baseline gap-3 px-4 py-4 sm:px-6 lg:px-8 ${i % 2 ? "border-l-2" : ""} ${i > 1 ? "border-t-2 lg:border-t-0" : ""} ${i === 2 ? "lg:border-l-2" : ""}`}
              >
                <dd className="font-display text-5xl leading-none tabular-nums sm:text-6xl">
                  {s.value}
                </dd>
                <dt className="ticket-label text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
        <div className="h-3 hazard" aria-hidden />
      </section>

      {/* Trades */}
      {categories.length > 0 && (
        <section aria-label="Trades" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <SectionHead index="01" title="Wetin spoil?" />
          <ul className="grid grid-cols-2 border-t-2 border-l-2 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c, i) => (
              <li key={c.id} className="border-r-2 border-b-2">
                <Link
                  href={`/search?category=${c.slug}`}
                  className="group flex h-full min-h-28 flex-col justify-between gap-3 bg-card p-3 transition-colors hover:bg-accent hover:text-accent-foreground sm:p-4"
                >
                  <span className="flex items-start justify-between">
                    <span className="ticket-label opacity-50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <CategoryIcon
                      iconKey={c.iconKey}
                      className="size-7 transition-transform group-hover:scale-125 group-hover:-rotate-12"
                    />
                  </span>
                  <span>
                    <span className="block font-headline text-2xl leading-[0.95]">{c.name}</span>
                    <span className="ticket-label opacity-60">{c.artisanCount} on the board</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The board */}
      {artisans.length > 0 && (
        <section
          aria-label="Highest trust scores"
          className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8"
        >
          <SectionHead
            index="02"
            title="Top of the board"
            aside={
              <Link href="/search" className={buttonVariants({ variant: "outline", size: "sm" })}>
                See everybody →
              </Link>
            }
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {artisans.map((a, i) => (
              <ArtisanCard key={a.id} artisan={a} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* How it works: four numbered panels, like instructions on a product box. */}
      <section aria-label="How it works" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <SectionHead index="03" title="How e dey work" />
        <ol className="grid border-t-2 border-l-2 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="relative overflow-hidden border-r-2 border-b-2 bg-card p-5 pt-24"
            >
              <span
                className="absolute -top-3 -left-1 font-display text-[7.5rem] leading-none text-accent [-webkit-text-stroke:2px_var(--foreground)]"
                aria-hidden
              >
                {i + 1}
              </span>
              <h3 className="font-headline text-2xl leading-none">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The score, itemised like a receipt. */}
      <section aria-label="The trust score" className="mt-20 border-y-2 bg-ink text-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="ticket-label text-danfo">04 / The trust score</p>
            <h2 className="mt-4 text-h1">
              A number you can <span className="gold-gradient-text">open up</span> and check.
            </h2>
            <p className="mt-5 max-w-md text-lg opacity-80">
              No paid placement. No mystery ranking. Seven measured parts add up to 100, and upheld
              complaints take points off. Every profile shows the full receipt.
            </p>
            <Link
              href="/how-trust-works"
              className={`${buttonVariants({ variant: "accent", size: "lg" })} mt-8 border-paper! shadow-[4px_4px_0_var(--paper)]!`}
            >
              Read the full formula
            </Link>
          </div>
          <div className="bg-paper p-5 font-label text-ink shadow-[8px_8px_0_var(--danfo)] sm:p-6">
            <p className="flex justify-between border-b-2 border-dashed border-ink pb-3 text-xs font-bold tracking-widest uppercase">
              <span>OgaSabi score sheet</span>
              <span>Formula v1</span>
            </p>
            <dl>
              {Object.entries(MAX_POINTS).map(([key, max]) => (
                <div
                  key={key}
                  className="flex items-baseline gap-2 border-b border-ink/25 py-2 text-sm"
                >
                  <dt className="font-semibold">{TRUST_COMPONENT[key]?.label}</dt>
                  <span
                    className="mb-1 flex-1 border-b-2 border-dotted border-ink/40"
                    aria-hidden
                  />
                  <dd className="font-bold tabular-nums">{String(max).padStart(2, "0")}</dd>
                </div>
              ))}
              <div className="flex items-baseline gap-2 border-b border-ink/25 py-2 text-sm text-signal">
                <dt className="font-semibold">Upheld complaints</dt>
                <span
                  className="mb-1 flex-1 border-b-2 border-dotted border-signal/40"
                  aria-hidden
                />
                <dd className="font-bold">−2 to −15</dd>
              </div>
              <div className="flex items-end justify-between pt-4">
                <dt className="text-xs font-bold tracking-widest uppercase">Total</dt>
                <dd className="font-display text-6xl leading-none">100</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* House rules */}
      <section aria-label="Safeguards" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <SectionHead index="05" title="House rules" />
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {RULES.map((r) => (
            <li key={r.title} className="flex gap-4 border-b-2 py-5">
              <span className="flex size-12 shrink-0 items-center justify-center border-2 bg-accent font-display text-3xl text-accent-foreground shadow-sm">
                {r.n}
              </span>
              <div>
                <h3 className="font-headline text-2xl leading-none">{r.title}</h3>
                <p className="mt-1.5 text-muted-foreground">{r.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* For artisans: a signboard. */}
      <section aria-label="For artisans" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <div className="relative border-2 bg-accent text-accent-foreground shadow-xl">
          <div className="h-3 border-b-2 border-ink hazard" aria-hidden />
          <div className="flex flex-wrap items-end justify-between gap-8 p-6 sm:p-10">
            <div className="max-w-2xl">
              <p className="ticket-label">Artisans wanted</p>
              <h2 className="mt-3 text-h1">You sabi the work? Hang your sign here.</h2>
              <p className="mt-4 max-w-lg text-lg">
                Free profile. Requests straight to your phone. A score that follows your good work
                from job to job.
              </p>
            </div>
            <Link href="/artisan/onboarding" className={buttonVariants({ size: "lg" })}>
              Join as an artisan →
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
