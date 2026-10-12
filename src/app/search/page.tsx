"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CategoryGrid, type Category } from "@/components/ui/category-grid";
import { ArtisanCard, type ArtisanCardData } from "@/components/ui/artisan-card";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES: Category[] = [
  { slug: "electrician", name: "Electrician", iconKey: "Zap" },
  { slug: "plumber", name: "Plumber", iconKey: "Droplets" },
  { slug: "ac-technician", name: "AC Technician", iconKey: "Snowflake" },
  { slug: "generator-technician", name: "Generator Tech", iconKey: "Fuel" },
  { slug: "solar-inverter", name: "Solar & Inverter", iconKey: "SunMedium" },
  { slug: "auto-mechanic", name: "Auto Mechanic", iconKey: "Car" },
  { slug: "carpenter", name: "Carpenter", iconKey: "Hammer" },
  { slug: "painter", name: "Painter", iconKey: "PaintRoller" },
  { slug: "tiler", name: "Tiler", iconKey: "LayoutGrid" },
  { slug: "welder", name: "Welder", iconKey: "Flame" },
  { slug: "mason", name: "Bricklayer", iconKey: "BrickWall" },
  { slug: "pop-ceiling", name: "POP & Ceiling", iconKey: "PanelTop" },
  { slug: "cctv-installer", name: "CCTV & Security", iconKey: "Cctv" },
  { slug: "dstv-installer", name: "DStv & Satellite", iconKey: "Satellite" },
  { slug: "appliance-repair", name: "Appliance Repair", iconKey: "Refrigerator" },
  { slug: "cleaner", name: "Cleaning", iconKey: "Sparkles" },
];

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);

  const {
    data: artisans,
    isLoading,
    refetch,
    error,
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
      return json.data.artisans as ArtisanCardData[];
    },
    staleTime: 1000 * 60,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="font-display text-h1">Find an artisan</h1>
        <p className="text-muted-foreground">
          Search by fault, filter by trade and location, see trust scores and verified reviews.
        </p>
      </header>

      <form onSubmit={handleSearch} className="space-y-6 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <label htmlFor="search" className="sr-only">
            Describe the fault or trade
          </label>
          <input
            id="search"
            type="text"
            placeholder="DESCRIBE THE FAULT OR TRADE (e.g. AC not cooling, sockets tripping)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full rounded-md border bg-background px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              "placeholder:text-muted-foreground",
            )}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Filter by trade</h3>
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
          <CategoryGrid
            categories={ALL_CATEGORIES}
            selectedSlug={selectedCategory}
            onSelect={(slug) => setSelectedCategory((prev) => (prev === slug ? null : slug))}
            maxVisible={16}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label htmlFor="radius" className="text-sm font-medium whitespace-nowrap">
              Service radius: {radiusKm} km
            </label>
            <input
              id="radius"
              type="range"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="max-w-xs flex-1"
            />
          </div>
          <Button type="submit" variant="accent" size="lg" disabled={isLoading}>
            {isLoading ? "Searching…" : "Find artisans"}
          </Button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Failed to load artisans. Please try again.
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-h2">Results {artisans && `(${artisans.length})`}</h2>
        </div>
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3 rounded-xl border bg-card p-4">
                <div className="h-6 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-8 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && artisans && artisans.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p className="font-medium">No artisans match your criteria.</p>
            <p className="mt-1">Try adjusting your search or filters.</p>
          </div>
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
