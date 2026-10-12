import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, formatPriceRange } from "@/lib/locale";

export const metadata = { title: "Design tokens", robots: { index: false } };

const swatches = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["muted", "bg-muted"],
  ["border", "bg-border"],
  ["primary", "bg-primary"],
  ["accent", "bg-accent"],
  ["secondary", "bg-secondary"],
  ["info", "bg-info"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["destructive", "bg-destructive"],
] as const;

const tiers = [
  ["New", "bg-tier-new"],
  ["Trusted", "bg-tier-trusted"],
  ["Highly trusted", "bg-tier-highly-trusted"],
  ["Top rated", "bg-tier-top-rated"],
] as const;

export default function DesignPage() {
  // Developer-only review page for the design system; never served in production.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-14 px-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-h1">Design tokens</h1>
        <p className="text-muted-foreground">
          Toggle dark mode by adding the <code>dark</code> class on the html element.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="colour">
        <h2 id="colour" className="font-display text-h2">
          Colour
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map(([name, cls]) => (
            <li key={name} className="space-y-2">
              <div className={`${cls} h-16 rounded-lg border`} />
              <p className="text-sm font-medium">{name}</p>
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap gap-3">
          {tiers.map(([name, cls]) => (
            <li
              key={name}
              className="flex items-center gap-2 rounded-full border bg-card py-1.5 pr-4 pl-2 text-sm"
            >
              <span className={`${cls} size-4 rounded-full`} />
              {name}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="type">
        <h2 id="type" className="font-display text-h2">
          Type
        </h2>
        <p className="font-display text-display">Know who is coming to fix it.</p>
        <p className="font-display text-h1">Briggs Electrical Works</p>
        <p className="text-lg">
          Body copy in Figtree at 16px with a 1.6 line height keeps lines readable on a phone in
          sunlight. Callout from {formatPriceRange(500_000, 1_500_000)}; deposit{" "}
          {formatMoney(250_000)}.
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="buttons">
        <h2 id="buttons" className="font-display text-h2">
          Buttons
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="accent" size="lg">
            Request service
          </Button>
          <Button>Save changes</Button>
          <Button variant="secondary">Message</Button>
          <Button variant="outline">Share on WhatsApp</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Decline</Button>
          <Button disabled>Sending…</Button>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="card">
        <h2 id="card" className="font-display text-h2">
          Surface
        </h2>
        <article className="max-w-md space-y-3 rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-semibold">Ibifuro Briggs</h3>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" aria-hidden /> Rumuola · 1.2 km
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
              <BadgeCheck className="size-4" aria-hidden /> Verified
            </span>
          </div>
          <p className="flex items-center gap-1 text-sm">
            <Star className="size-4 fill-accent text-accent" aria-hidden /> 4.8 ·{" "}
            {formatPriceRange(500_000, 1_500_000)}
          </p>
        </article>
      </section>
    </main>
  );
}
