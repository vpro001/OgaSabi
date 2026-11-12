"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { LocationPicker } from "@/components/site/location-picker";
import { usePlace } from "@/hooks/use-place";

/** The search slab: one thick-ruled form, three cells, a yellow plate to press. */
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
        className="flex flex-col border-2 bg-card shadow-xl sm:flex-row"
      >
        <label className="flex min-h-16 flex-1 flex-col justify-center px-4 py-2">
          <span className="ticket-label text-muted-foreground">What is broken?</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="AC not cooling, socket sparking, tap leaking…"
            className="w-full bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
            enterKeyHint="search"
          />
        </label>
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="flex min-h-16 flex-col justify-center border-t-2 px-4 py-2 text-left hover:bg-primary-container sm:w-56 sm:border-t-0 sm:border-l-2"
        >
          <span className="ticket-label text-muted-foreground">Where?</span>
          <span className="flex items-center gap-1.5 truncate text-lg font-semibold">
            <MapPin className="size-4 shrink-0 text-secondary" aria-hidden />
            <span className="truncate">{place ? place.label : "Choose area"}</span>
          </span>
        </button>
        <button
          type="submit"
          className="min-h-16 cursor-pointer border-t-2 bg-accent px-8 font-display text-2xl text-accent-foreground transition-colors hover:bg-foreground hover:text-accent sm:border-t-0 sm:border-l-2"
        >
          Find am →
        </button>
      </form>
      <LocationPicker open={picker} onClose={() => setPicker(false)} />
    </>
  );
}
