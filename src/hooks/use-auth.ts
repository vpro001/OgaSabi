"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { type Me } from "@/lib/types";

export const ME_KEY = ["me"] as const;

/** The signed-in user, `null` when signed out, `undefined` while loading. */
export function useMe() {
  const query = useQuery<Me | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      // The hint cookie avoids a guaranteed 401 for visitors who have never signed in.
      if (!document.cookie.includes("og_s=1")) return null;
      try {
        return await api<Me>("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  return { me: query.data, isLoading: query.isPending, refetch: query.refetch };
}

type Need = "any" | "artisan" | "admin";

/** Redirects to sign-in (or home, when the role is missing) and returns the user once allowed. */
export function useRequireAuth(need: Need = "any"): Me | undefined {
  const { me } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const allowed =
    !!me &&
    (need === "any" ||
      (need === "artisan" && !!me.artisan) ||
      (need === "admin" && me.roles.includes("ADMIN")));

  useEffect(() => {
    if (me === undefined) return;
    if (me === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!allowed) router.replace(need === "artisan" ? "/artisan/onboarding" : "/");
  }, [me, allowed, need, pathname, router]);

  return allowed ? (me ?? undefined) : undefined;
}

export function useSignOut() {
  const client = useQueryClient();
  const router = useRouter();
  return async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    client.clear();
    client.setQueryData(ME_KEY, null);
    router.push("/");
    router.refresh();
  };
}
