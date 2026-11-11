"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type OwnArtisanProfile } from "@/lib/types";

export const OWN_ARTISAN_KEY = ["me", "artisan"] as const;

export function useOwnArtisan(enabled: boolean) {
  return useQuery({
    queryKey: OWN_ARTISAN_KEY,
    queryFn: () => api<OwnArtisanProfile | null>("/me/artisan"),
    enabled,
  });
}
