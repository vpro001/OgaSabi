"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CategoryGrid, type Category } from "@/components/ui/category-grid";
import { ArtisanCard, type ArtisanCardData } from "@/components/ui/artisan-card";
import { cn } from "@/lib/utils";

// Temporary placeholder categories – in a real app these come from the DB seed
const ALL_CATEGORIES: Category[] = [
  { slug: "electrician", name: "Electrician", iconKey: "Zap" },
  { slug: "plumber", name: "Plumber", iconKey: "Droplets" },
  { slug: "ac-technician", name: "AC Technician", iconKey: "Snowflake" },
  { slug: "generator", name: "Generator Tech", iconKey: "Fuel" },
  { slug: "solar", name: "Solar Inverter", iconKey: "SunMedium" },
  { slug: "auto-mechanic", name: "Auto Mechanic", iconKey: "Car" },
  { slug: "carpenter", name: "Carpenter", iconKey: "Hammer" },
  { slug: "painter", name: "Painter", iconKey: "PaintRoller" },
];

export default function HomePage() {
  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);

  // TanStack Query – fetch artisans based on current filters
  const {
    data: artisans,
    isLoading,
    refetch,
  } = useQuery<ArtisanCardData[]>({
    queryKey: ["artisans", searchTerm, selectedCategory, radiusKm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("q", searchTerm);
      if (selectedCategory) params.append("category", selectedCategory);
      params.append("radiusKm", radiusKm.toString());
      const res = await fetch(`/api/v1/artisans?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load artisans");
      const json = await res.json();
      // API follows ApiEnvelope<T>
      return json.data.artisans as ArtisanCardData[];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-6 py-8">
      {/* Hero */}
      <section className="space-y-6 text-center">
        <h1 className="font-display text-h1">
          Stop asking WhatsApp groups. Hire verified artisans who actually sabi work.
        </h1>
        <p className="mx-auto max-w-2xl font-display text-display text-muted-foreground">
          Find reliable electricians, plumbers, AC technicians and more – all vetted, rated and
          sorted by trust score.
        </p>
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-center"
        >
          {/* Search input */}
          <div className="min-w-0 flex-1">
            <label htmlFor="search" className="sr-only">
              Describe the fault or trade
            </label>
            <input
              id="search"
              type="text"
              placeholder="DESCRIBE THE FAULT OR TRADE"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full rounded-md border bg-card px-4 py-2 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                "placeholder:text-muted-foreground",
              )}
            />
          </div>
          {/* Category quick chips */}
          <CategoryGrid
            categories={ALL_CATEGORIES}
            selectedSlug={selectedCategory}
            onSelect={(slug) => setSelectedCategory((prev) => (prev === slug ? null : slug))}
            maxVisible={6}
          />
          {/* Radius slider */}
          <div className="flex items-center gap-2 sm:w-48">
            <label htmlFor="radius" className="text-sm font-medium whitespace-nowrap">
              Radius ({radiusKm} km)
            </label>
            <input
              id="radius"
              type="range"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          {/* CTA */}
          <Button type="submit" variant="accent" size="lg">
            Find Sabi
          </Button>
        </form>
        {/* Quick search chips – alternate view for very small screens */}
        <div className="mt-4 sm:hidden">
          <CategoryGrid
            categories={ALL_CATEGORIES}
            selectedSlug={selectedCategory}
            onSelect={setSelectedCategory}
            maxVisible={4}
          />
        </div>
      </section>

      {/* Artisan grid */}
      <section>
        <h2 className="mb-4 font-display text-h2">
          Verified Artisans in Lekki Phase 1 &amp; Surrounds
        </h2>
        {isLoading && <p className="text-muted-foreground">Loading artisans…</p>}
        {!isLoading && artisans && artisans.length === 0 && (
          <p className="text-muted-foreground">No artisans match your criteria.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {artisans?.map((artisan) => (
            <ArtisanCard key={artisan.id} artisan={artisan} href={`/artisans/${artisan.id}`} />
          ))}
        </div>
      </section>
    </main>
  );
}
