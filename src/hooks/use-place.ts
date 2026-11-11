"use client";

import { useCallback, useSyncExternalStore } from "react";
import { nearestPlace, type Place } from "@/lib/geo";

export type SavedPlace = Place & { precise: boolean };

const KEY = "ogasabi-place";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: SavedPlace | null } = { raw: null, value: null };

function read(): SavedPlace | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw === cache.raw) return cache.value;
  let value: SavedPlace | null = null;
  try {
    const parsed = raw ? (JSON.parse(raw) as SavedPlace) : null;
    if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") value = parsed;
  } catch {
    value = null;
  }
  cache = { raw, value };
  return value;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

/** The area the visitor is searching in. Kept in the browser only; never sent until they search. */
export function usePlace() {
  const place = useSyncExternalStore(subscribe, read, () => null);
  const setPlace = useCallback((next: SavedPlace | null) => {
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next));
      else localStorage.removeItem(KEY);
    } catch {
      /* private mode: the choice simply lasts for this page */
    }
    listeners.forEach((fn) => fn());
  }, []);
  return { place, setPlace };
}

/** Asks the browser for the device position and names it after the nearest known area. */
export function locateDevice(): Promise<SavedPlace> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator))
      return reject(new Error("This browser cannot share a location."));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const near = nearestPlace(lat, lng);
        resolve({
          label: near ? `Near ${near.label}` : "My location",
          city: near?.city ?? "",
          state: near?.state ?? "",
          lat,
          lng,
          precise: true,
        });
      },
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location access was blocked. Choose your area from the list instead."
              : "We could not get your location. Choose your area from the list instead.",
          ),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}
