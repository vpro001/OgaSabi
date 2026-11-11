import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  EyeOff,
  MessageCircle,
  Scale,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Shell } from "@/components/site/shell";
import { HeroSearch } from "@/components/site/hero-search";
import { ArtisanCard } from "@/components/artisan/artisan-card";
import { CategoryIcon } from "@/components/artisan/category-icon";
import { buttonVariants } from "@/components/ui/button";
import { listCategories, platformStats, searchArtisans } from "@/server/services/artisans";
import { MAX_POINTS } from "@/server/trust/formula";
import { TRUST_COMPONENT } from "@/lib/format";
import { logger } from "@/server/logger";
import { cn } from "@/lib/utils";

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
    title: "Describe the fault",
    body: "Say what is wrong, add photos, and pick when you need someone.",
  },
  {
    title: "Compare trusted artisans",
    body: "See distance, callout fee, verified reviews and how each trust score is made up.",
  },
  {
    title: "Agree the price first",
    body: "The artisan accepts or sends a quote. Nothing is booked until you both agree.",
  },
  {
    title: "Confirm and review",
    body: "You confirm the work is done. Only customers with a completed job can review.",
  },
];

const SAFEGUARDS = [
  {
    icon: BadgeCheck,
    title: "Identity checked by people",
    body: "Artisans submit government ID and a selfie. Our team reviews every submission before a verified badge appears.",
  },
  {
    icon: EyeOff,
    title: "Your address stays private",
    body: "Artisans see only your area and a rounded distance until the job is accepted. Phone numbers are shared at the same moment.",
  },
  {
    icon: Star,
    title: "Reviews you can believe",
    body: "A review can only be written after a job is confirmed complete, one review per job. Artisans can reply but cannot remove them.",
  },
  {
    icon: Scale,
    title: "A fair way to disagree",
    body: "If something goes wrong, open a dispute within 48 hours. Upheld complaints lower an artisan's score for everyone to see.",
  },
];

export default async function HomePage() {
  const { stats, categories, artisans } = await loadHome();
  const statItems = stats
    ? [
        { value: stats.artisans.toLocaleString("en-NG"), label: "Active artisans" },
        { value: stats.verified.toLocaleString("en-NG"), label: "ID verified" },
        { value: stats.completedJobs.toLocaleString("en-NG"), label: "Jobs completed" },
        {
          value: String(stats.cities.length),
          label: stats.cities.length === 1 ? "City" : "Cities",
        },
      ]
    : [];

  return (
    <Shell bare>
      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div
          className="pointer-events-none absolute inset-0 adire-pattern opacity-50"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-32 right-1/4 size-[500px] rounded-full bg-primary-container/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/3 -left-20 size-[420px] rounded-full bg-accent-container/30 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-container px-3.5 py-1.5 font-label text-xs font-semibold tracking-wider text-primary-container-foreground uppercase">
            <span
              className="size-2 rounded-full bg-accent shadow-[0_0_8px_rgba(254,147,44,0.5)]"
              aria-hidden
            />
            Trust scores built from real, completed jobs
          </p>
          <h1 className="max-w-4xl font-headline text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-[58px]">
            Stop asking WhatsApp groups. Hire verified artisans who{" "}
            <span className="gold-gradient-text">actually sabi work.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Electricians, plumbers, AC and generator technicians near you. Every one comes with a
            trust score you can open up and check: identity, completed jobs, customer reviews and
            how fast they respond.
          </p>
          <div className="mt-8 max-w-3xl">
            <HeroSearch />
          </div>
          {categories.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="font-label text-xs font-semibold text-muted-foreground">
                Popular:
              </span>
              {categories.slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  href={`/search?category=${c.slug}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium hover:border-primary/40 hover:bg-muted"
                >
                  <CategoryIcon iconKey={c.iconKey} className="size-4 text-secondary" />
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {statItems.length > 0 && (
            <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {statItems.map((s) => (
                <div key={s.label} className="border-l-2 border-accent pl-3">
                  <dd className="font-headline text-3xl font-extrabold tabular-nums">{s.value}</dd>
                  <dt className="font-label text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section aria-labelledby="trades" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 id="trades" className="text-h2 font-extrabold">
            What needs fixing?
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/search?category=${c.slug}`}
                  className="group flex h-full items-center gap-3 card-surface p-4 transition-colors hover:border-primary/40"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary-container-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                    <CategoryIcon iconKey={c.iconKey} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.artisanCount} {c.artisanCount === 1 ? "artisan" : "artisans"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Top artisans */}
      {artisans.length > 0 && (
        <section aria-labelledby="top" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="top" className="text-h2 font-extrabold">
                Highest trust scores right now
              </h2>
              <p className="mt-1 text-muted-foreground">
                Set your area to see who is closest to you.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-flex min-h-11 items-center gap-1 font-bold text-primary hover:underline"
            >
              See all artisans <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artisans.map((a) => (
              <ArtisanCard key={a.id} artisan={a} />
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section aria-labelledby="how" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 id="how" className="text-h2 font-extrabold">
          How OgaSabi works
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card-surface p-5">
              <span className="font-headline text-4xl font-black text-accent tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Trust score */}
      <section aria-labelledby="trust" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 rounded-3xl bg-[#032515] p-6 text-white sm:p-10 lg:grid-cols-2">
          <div>
            <p className="font-label text-xs font-bold tracking-widest text-[#fe932c] uppercase">
              The trust score
            </p>
            <h2 id="trust" className="mt-2 text-h2 font-extrabold">
              A number out of 100 that you can open up and check
            </h2>
            <p className="mt-3 text-emerald-100/80">
              No paid placement and no mystery ranking. Each score is the sum of seven measured
              parts, minus points for upheld complaints. Every artisan&apos;s profile shows the full
              breakdown.
            </p>
            <Link
              href="/how-trust-works"
              className={cn(buttonVariants({ variant: "accent" }), "mt-6")}
            >
              See exactly how it is calculated
            </Link>
          </div>
          <ul className="space-y-3">
            {Object.entries(MAX_POINTS).map(([key, max]) => (
              <li key={key} className="flex items-center gap-4">
                <span className="w-12 shrink-0 text-right font-headline text-2xl font-black text-[#fe932c] tabular-nums">
                  {max}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{TRUST_COMPONENT[key]?.label}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#fe932c]"
                      style={{ width: `${(max / 30) * 100}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Safeguards */}
      <section aria-labelledby="safe" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 id="safe" className="text-h2 font-extrabold">
          Built so you know who is coming to your door
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {SAFEGUARDS.map((s) => (
            <li key={s.title} className="flex gap-4 card-surface p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
                <s.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Artisan call to action */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-accent-container p-6 sm:p-10">
          <div className="pointer-events-none absolute inset-0 adire-pattern" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-h2 font-extrabold text-accent-container-foreground">
                You sabi the work? Let customers find you.
              </h2>
              <p className="mt-2 text-accent-container-foreground/80">
                Create a free profile, get verified, and build a trust score that follows your good
                work.
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-accent-container-foreground">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4" aria-hidden /> Free to join
                </li>
                <li className="flex items-center gap-1.5">
                  <MessageCircle className="size-4" aria-hidden /> Requests sent to your phone
                </li>
              </ul>
            </div>
            <Link href="/artisan/onboarding" className={buttonVariants({ size: "lg" })}>
              Join as an artisan
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
