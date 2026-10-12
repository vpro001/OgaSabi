"use client";

import { Calendar, MapPin, Search, Star } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Describe the fault",
    description:
      'Type what\'s wrong — "AC not cooling", "sockets tripping", "generator won\'t start" — or pick a trade.',
    icon: Search,
  },
  {
    number: "02",
    title: "See verified matches",
    description:
      "We show artisans near you with trust scores, response times, verified reviews, and fixed callout fees.",
    icon: MapPin,
  },
  {
    number: "03",
    title: "Request inspection",
    description:
      "Book a paid diagnostic visit. Pay only if satisfied with the assessment. No hidden fees.",
    icon: Calendar,
  },
  {
    number: "04",
    title: "Job done & reviewed",
    description:
      "Confirm completion, leave a verified review. Your feedback updates their trust score for the next customer.",
    icon: Star,
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <header className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-display text-h2 lg:text-h1">How it works</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Four steps from fault to fixed. No WhatsApp groups, no ghosting, no surprises.
          </p>
        </header>
        <div className="relative">
          <ol className="space-y-8 lg:grid lg:grid-cols-4 lg:space-y-0">
            {steps.map((step, index) => (
              <li key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="absolute top-5 left-[50%] -z-10 hidden h-0.5 w-full bg-border lg:block" />
                )}
                <div className="relative text-center lg:text-left">
                  <div className="font-display mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary lg:mx-auto">
                    {step.number}
                  </div>
                  <div className="mb-3 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary lg:mx-auto">
                    <step.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="font-display font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
