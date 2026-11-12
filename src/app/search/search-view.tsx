"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MapPin, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { ArtisanCard, ArtisanCardSkeleton } from "@/components/artisan/artisan-card";
import { CategoryIcon } from "@/components/artisan/category-icon";
import { LocationPicker } from "@/components/site/location-picker";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { usePlace } from "@/hooks/use-place";
import { api, apiWithMeta, errorMessage } from "@/lib/api";
import { type ArtisanCardData, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const RADII = [5, 10, 20, 50];
const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "distance", label: "Nearest first" },
  { value: "trust", label: "Highest trust score" },
  { value: "rating", label: "Best rated" },
];

export function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { place } = usePlace();
  const [picker, setPicker] = useState(false);

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "recommended";
  const radius = Number(params.get("radius")) || 20;
  const availableNow = params.get("now") === "1";
  const verifiedOnly = params.get("verified") === "1";
  const [draft, setDraft] = useState(q);
  const [prevQ, setPrevQ] = useState(q);

  // Sync draft if the URL parameter changes externally (e.g., back button)
  if (q !== prevQ) {
    setPrevQ(q);
    setDraft(q);
  }

  // Filters live in the URL so a search can be shared, bookmarked and survives a reload.
  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
    staleTime: 600_000,
  });

  const results = useInfiniteQuery({
    queryKey: [
      "artisans",
      { q, category, sort, radius, availableNow, verifiedOnly, lat: place?.lat, lng: place?.lng },
    ],
    initialPageParam: "0",
    queryFn: async ({ pageParam, signal }) => {
      const search = new URLSearchParams({ limit: "12", cursor: pageParam, sort });
      if (q) search.set("q", q);
      if (category) search.set("category", category);
      if (availableNow) search.set("availableNow", "true");
      if (verifiedOnly) search.set("verifiedOnly", "true");
      if (place) {
        search.set("lat", String(place.lat));
        search.set("lng", String(place.lng));
        search.set("radiusKm", String(radius));
      }
      return apiWithMeta<{ artisans: ArtisanCardData[] }>(`/artisans?${search}`, { signal });
    },
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

  const artisans = results.data?.pages.flatMap((p) => p.data.artisans) ?? [];
  const total = results.data?.pages[0]?.meta.total ?? 0;
  const activeCategory = categories.data?.find((c) => c.slug === category);
  const filterCount = [category, availableNow, verifiedOnly].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-h1 font-extrabold">
          {activeCategory ? `${activeCategory.name}s near you` : "Find an artisan"}
        </h1>
        <p className="text-muted-foreground">
          Compare trust scores, verified reviews and callout fees before you send a request.
        </p>
      </div>

      <div className="space-y-4 p-4 card-surface sm:p-5">
        <form
          role="search"
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: draft.trim() || null });
          }}
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              aria-label="Describe the fault or trade"
              placeholder="Describe the fault or trade, e.g. sockets tripping"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="field pl-11"
            />
          </div>
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="flex field items-center gap-2 text-left font-semibold sm:w-60"
          >
            <MapPin className="size-5 shrink-0 text-accent" aria-hidden />
            <span className="truncate">{place ? place.label : "Choose your area"}</span>
          </button>
          <Button type="submit" variant="accent">
            Search
          </Button>
        </form>

        <div
          className="-mx-4 scrollbar-none flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5"
          role="group"
          aria-label="Filter by trade"
        >
          <Chip active={!category} onClick={() => setParam({ category: null })}>
            All trades
          </Chip>
          {categories.data?.map((c) => (
            <Chip
              key={c.id}
              active={c.slug === category}
              onClick={() => setParam({ category: c.slug === category ? null : c.slug })}
            >
              <CategoryIcon iconKey={c.iconKey} className="size-4" />
              {c.name}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-4">
          <span className="inline-flex items-center gap-1.5 font-label text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <SlidersHorizontal className="size-4" aria-hidden /> Filters
            {filterCount > 0 && ` (${filterCount})`}
          </span>
          <Toggle
            checked={availableNow}
            onChange={(v) => setParam({ now: v ? "1" : null })}
            label="Free right now"
          />
          <Toggle
            checked={verifiedOnly}
            onChange={(v) => setParam({ verified: v ? "1" : null })}
            label="ID verified only"
          />
          {place && (
            <label className="flex items-center gap-2 text-sm font-medium">
              Within
              <Select
                aria-label="Search radius"
                value={String(radius)}
                onChange={(e) => setParam({ radius: e.target.value })}
                className="min-h-10 w-auto py-1.5"
              >
                {RADII.map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm font-medium sm:ml-auto">
            Sort
            <Select
              aria-label="Sort results"
              value={sort}
              onChange={(e) =>
                setParam({ sort: e.target.value === "recommended" ? null : e.target.value })
              }
              className="min-h-10 w-auto py-1.5"
            >
              {SORTS.filter((s) => s.value !== "distance" || place).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      {!place && (
        <Alert tone="info" title="Showing artisans everywhere">
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="font-semibold text-primary underline underline-offset-2"
          >
            Choose your area
          </button>{" "}
          to see who is closest and who covers your address.
        </Alert>
      )}

      <section aria-live="polite" aria-busy={results.isFetching}>
        {results.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <ArtisanCardSkeleton key={i} />
            ))}
          </div>
        ) : results.isError ? (
          <ErrorState message={errorMessage(results.error)} onRetry={() => results.refetch()} />
        ) : artisans.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No artisans match that search"
            action={
              <Button variant="outline" onClick={() => router.replace(pathname)}>
                Clear all filters
              </Button>
            }
          >
            {place
              ? `Try a wider radius than ${radius} km, another trade, or fewer filters.`
              : "Try another trade or fewer filters."}
          </EmptyState>
        ) : (
          <>
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              {total} {total === 1 ? "artisan" : "artisans"}
              {place && ` within ${radius} km of ${place.label}`}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artisans.map((a) => (
                <ArtisanCard key={a.id} artisan={a} />
              ))}
            </div>
            {results.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => results.fetchNextPage()}
                  disabled={results.isFetchingNextPage}
                >
                  {results.isFetchingNextPage && <Spinner className="size-4" />}
                  Show more artisans
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <LocationPicker open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-none border px-3.5 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:border-primary/40 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 rounded accent-(--primary)"
      />
      {label}
    </label>
  );
}
