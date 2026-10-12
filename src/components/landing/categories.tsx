"use client";

import Link from "next/link";
import {
  BrickWall,
  Car,
  Cctv,
  Droplets,
  Flame,
  Fuel,
  Hammer,
  LayoutGrid,
  PaintRoller,
  PanelTop,
  Refrigerator,
  Satellite,
  Snowflake,
  Sparkles,
  SunMedium,
  Zap,
} from "lucide-react";

const categories = [
  {
    slug: "electrician",
    name: "Electrician",
    icon: Zap,
    desc: "Wiring, sockets, DB boards, fault finding",
  },
  {
    slug: "plumber",
    name: "Plumber",
    icon: Droplets,
    desc: "Leaks, pipes, tanks, pumps, drainage",
  },
  {
    slug: "ac-technician",
    name: "AC Technician",
    icon: Snowflake,
    desc: "Installation, gas refill, servicing, repair",
  },
  {
    slug: "generator-technician",
    name: "Generator Tech",
    icon: Fuel,
    desc: "Petrol & diesel servicing, repair up to 60kVA",
  },
  {
    slug: "solar-inverter",
    name: "Solar & Inverter",
    icon: SunMedium,
    desc: "Inverter, battery, solar panel installs",
  },
  {
    slug: "auto-mechanic",
    name: "Auto Mechanic",
    icon: Car,
    desc: "Diagnosis, servicing, brakes, mobile repairs",
  },
  {
    slug: "carpenter",
    name: "Carpenter",
    icon: Hammer,
    desc: "Doors, wardrobes, roofing, furniture",
  },
  {
    slug: "painter",
    name: "Painter",
    icon: PaintRoller,
    desc: "Interior & exterior, emulsion & gloss",
  },
  {
    slug: "tiler",
    name: "Tiler",
    icon: LayoutGrid,
    desc: "Floor & wall tiling, screeding, grouting",
  },
  {
    slug: "welder",
    name: "Welder",
    icon: Flame,
    desc: "Gates, burglar-proof, railings, fabrication",
  },
  {
    slug: "mason",
    name: "Bricklayer",
    icon: BrickWall,
    desc: "Block work, plastering, fencing, construction",
  },
  {
    slug: "pop-ceiling",
    name: "POP & Ceiling",
    icon: PanelTop,
    desc: "POP ceilings, cove lighting, screeding",
  },
  {
    slug: "cctv-installer",
    name: "CCTV & Security",
    icon: Cctv,
    desc: "Cameras, electric fences, alarms, access control",
  },
  {
    slug: "dstv-installer",
    name: "DStv & Satellite",
    icon: Satellite,
    desc: "Dish installation, realignment, decoder setup",
  },
  {
    slug: "appliance-repair",
    name: "Appliance Repair",
    icon: Refrigerator,
    desc: "Fridges, freezers, washers, microwaves",
  },
  {
    slug: "cleaner",
    name: "Cleaning",
    icon: Sparkles,
    desc: "Home, office, post-construction, fumigation",
  },
];

export function Categories() {
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-h2 lg:text-h1">Every trade you need</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            16 categories, 500+ verified artisans across Lagos, Port Harcourt and Abuja.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              className="group rounded-xl border bg-card p-5 transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="mb-3 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <cat.icon className="size-5" aria-hidden />
              </div>
              <h3 className="font-display font-semibold">{cat.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{cat.desc}</p>
            </Link>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/artisans">
            <span className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
              View all categories & artisan counts
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
