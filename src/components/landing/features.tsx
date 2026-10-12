"use client";

import { CheckCircle, Clock, MapPin, Search, Shield, Star } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Search by fault or trade",
    description:
      "Describe the problem in your own words — &ldquo;AC blowing warm air&rdquo; or &ldquo;sockets tripping breaker&rdquo; — and we&rsquo;ll match you with the right specialist.",
  },
  {
    icon: Shield,
    title: "Verified & trust-scored",
    description:
      "Every artisan passes ID verification, has a work portfolio, and earns a trust score from real job outcomes — completion rate, response time, reviews, disputes.",
  },
  {
    icon: MapPin,
    title: "Local to you",
    description:
      "Filter by area and service radius. See distance in km, response time, and whether they're available now. No more artisans from across town who never show up.",
  },
  {
    icon: Star,
    title: "Verified reviews only",
    description:
      'Reviews come from completed, paid jobs — no fake ratings. See tags like "Fair price", "Clean work", "Punctual" to know what matters.',
  },
  {
    icon: CheckCircle,
    title: "Fixed callout fees",
    description:
      "Know the inspection price upfront. Pay only if satisfied with diagnostics. No surprise quotes after they arrive.",
  },
  {
    icon: Clock,
    title: "Fast response, 24/7",
    description:
      "Median first response under 15 minutes. Emergency slots for AC, generator, and electrical faults. Book now or schedule for tomorrow.",
  },
];

export function Features() {
  return (
    <section className="bg-muted/30 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <header className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-display text-h2 lg:text-h1">Built for how you actually hire</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No endless calls, no ghosting, no &ldquo;I&rsquo;m on my way&rdquo; for three hours.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="size-5" aria-hidden />
              </div>
              <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
