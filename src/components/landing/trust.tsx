"use client";

import { CheckCircle, Shield, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const reviews = [
  {
    name: "Aisha K.",
    location: "Lekki Phase 1",
    rating: 5,
    text: "Engr. Babatunde was amazing! Fixed my AC in 2 hours, professional and polite. Will definitely use again.",
    tags: ["Fast", "Professional", "Fair Price"],
    avatar: "AK",
  },
  {
    name: "Mr. Okafor",
    location: "Victoria Island",
    rating: 5,
    text: "Excellent service! The generator technician arrived on time and explained everything clearly. Great value for money.",
    tags: ["Knowledgeable", "Good Value", "Punctual"],
    avatar: "MO",
  },
  {
    name: "Chiamaka O.",
    location: "Yaba",
    rating: 4,
    text: "Fixed my wiring issue quickly. Price was fair but arrived 30 mins later than agreed. Good work overall.",
    tags: ["Clean Work", "Fair Price"],
    avatar: "CO",
  },
];

const trustItems = [
  {
    icon: Shield,
    title: "Identity Verified",
    desc: "NIN, Driver's Licence or Passport + selfie match",
  },
  {
    icon: CheckCircle,
    title: "Portfolio Required",
    desc: "Photos of past work verified by our team",
  },
  {
    icon: Star,
    title: "Verified Reviews Only",
    desc: "Only customers who paid for completed jobs can review",
  },
  {
    icon: Users,
    title: "Dispute Protection",
    desc: "48-hour window, admin mediation, refunds when upheld",
  },
];

export function Trust() {
  return (
    <section className="bg-muted/30 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-h2 lg:text-h1">Trust built on outcomes</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Not promises. Verified identity, real portfolios, reviews from paid jobs, and a trust
            score that updates with every job.
          </p>
        </header>

        <div className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {trustItems.map((item) => (
            <div key={item.title} className="rounded-xl border bg-card p-4 text-center">
              <div className="mx-auto mb-3 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" aria-hidden />
              </div>
              <h3 className="font-display font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.name} className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {review.avatar}
                </div>
                <div>
                  <p className="font-medium">{review.name}</p>
                  <p className="text-sm text-muted-foreground">{review.location}</p>
                </div>
              </div>
              <div className="my-4 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-4",
                      i < review.rating ? "fill-accent text-accent" : "text-muted-foreground/30",
                    )}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="mb-4 text-sm text-foreground/80">&ldquo;{review.text}&rdquo;</p>
              <div className="flex flex-wrap gap-1">
                {review.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-primary p-8 text-center text-primary-foreground">
          <h3 className="font-display text-h2">Ready to find your artisan?</h3>
          <p className="mt-2 text-lg opacity-90">
            Search by fault, filter by area, see trust scores and verified reviews. Book in 2
            minutes.
          </p>
          <a
            href="/search"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Find an artisan now
          </a>
        </div>
      </div>
    </section>
  );
}
