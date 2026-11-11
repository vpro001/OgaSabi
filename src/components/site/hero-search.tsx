"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/site/location-picker";
import { usePlace } from "@/hooks/use-place";

export function HeroSearch() {
  const router = useRouter();
  const { place } = usePlace();
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState(false);

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
        }}
        className="flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-xl shadow-primary/5 sm:flex-row sm:items-center"
      >
        <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl px-3">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">What do you need fixed?</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What do you need fixed? e.g. AC not cooling"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
            enterKeyHint="search"
          />
        </label>
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="flex min-h-12 items-center gap-2 rounded-xl border-t px-3 text-left text-sm font-semibold hover:bg-muted sm:max-w-56 sm:border-t-0 sm:border-l sm:pl-4"
        >
          <MapPin className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="truncate">{place ? place.label : "Choose your area"}</span>
        </button>
        <Button type="submit" variant="accent" size="lg" className="rounded-xl">
          Find artisans
        </Button>
      </form>
      <LocationPicker open={picker} onClose={() => setPicker(false)} />
    </>
  );
}
