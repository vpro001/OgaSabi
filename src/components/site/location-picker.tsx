"use client";

import { useMemo, useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { PLACES } from "@/lib/geo";
import { errorMessage } from "@/lib/api";
import { locateDevice, type SavedPlace, usePlace } from "@/hooks/use-place";

/** Lets the visitor choose where they need help: device location or a named area. */
export function LocationPicker({
  open,
  onClose,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  onPicked?: (p: SavedPlace) => void;
}) {
  const { place, setPlace } = usePlace();
  const [filter, setFilter] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const hits = PLACES.filter(
      (p) => !q || `${p.label} ${p.city} ${p.state}`.toLowerCase().includes(q),
    );
    const byCity = new Map<string, typeof PLACES>();
    for (const p of hits) byCity.set(p.city, [...(byCity.get(p.city) ?? []), p]);
    return [...byCity.entries()];
  }, [filter]);

  const choose = (p: SavedPlace) => {
    setPlace(p);
    onPicked?.(p);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Where do you need help?"
      description="We use this to show artisans who cover your area. Your exact address stays private."
    >
      <div className="space-y-4">
        <button
          type="button"
          disabled={locating}
          onClick={async () => {
            setError(null);
            setLocating(true);
            try {
              choose(await locateDevice());
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setLocating(false);
            }
          }}
          className="flex tap-target w-full items-center gap-3 rounded-xl border border-primary/25 bg-primary-container/40 px-4 py-3 text-left font-semibold hover:bg-primary-container/70 disabled:opacity-60"
        >
          {locating ? <Spinner /> : <LocateFixed className="size-5 text-primary" aria-hidden />}
          Use my current location
        </button>
        {error && <Alert tone="warning">{error}</Alert>}

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="place-filter"
            aria-label="Search areas"
            placeholder="Search areas, e.g. Lekki, Wuse, Rumuola"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
          {groups.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No matching area yet. Try your current location instead.
            </p>
          )}
          {groups.map(([city, places]) => (
            <div key={city}>
              <p className="mb-1.5 font-label text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {city}
              </p>
              <ul className="grid grid-cols-2 gap-1.5">
                {places.map((p) => {
                  const active = place?.label === p.label && place.city === p.city;
                  return (
                    <li key={`${p.city}-${p.label}`}>
                      <button
                        type="button"
                        onClick={() => choose({ ...p, precise: false })}
                        aria-pressed={active}
                        className="flex tap-target w-full items-center gap-2 rounded-lg border px-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary-container/50"
                      >
                        <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{p.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
