"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import { ProfileForm } from "@/components/artisan/profile-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, ErrorState, PageLoading, Spinner } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useRequireAuth } from "@/hooks/use-auth";
import { OWN_ARTISAN_KEY, useOwnArtisan } from "@/hooks/use-own-artisan";
import { api, errorMessage, uploadFile } from "@/lib/api";
import { DAYS, formatMinute } from "@/lib/format";
import { type OwnArtisanProfile, type Photo, type Slot } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EditProfile() {
  const me = useRequireAuth("artisan");
  const toast = useToast();
  const profile = useOwnArtisan(!!me);
  if (!me || profile.isPending) return <PageLoading />;
  if (profile.isError || !profile.data)
    return (
      <ErrorState
        message={profile.error ? errorMessage(profile.error) : "Profile not found."}
        onRetry={() => profile.refetch()}
      />
    );
  const p = profile.data;
  return (
    <div className="space-y-6">
      <Link
        href={`/artisans/${p.id}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <ExternalLink className="size-4" aria-hidden /> View as a customer
      </Link>
      <ProfileForm
        initial={p}
        submitLabel="Save profile"
        onSaved={() => toast.success("Profile saved.")}
      />
      <AvailabilityEditor initial={p.availability} />
      <PortfolioEditor photos={p.portfolio} />
    </div>
  );
}

const TIMES = Array.from({ length: 37 }, (_, i) => 300 + i * 30); // 5:00am to 11:00pm in half hours

function AvailabilityEditor({ initial }: { initial: Slot[] }) {
  const toast = useToast();
  const client = useQueryClient();
  // One window per day keeps the editor simple; the API accepts several.
  const [days, setDays] = useState(() =>
    DAYS.map((_, dayOfWeek) => {
      const slot = initial.find((s) => s.dayOfWeek === dayOfWeek);
      return {
        open: !!slot,
        startMinute: slot?.startMinute ?? 480,
        endMinute: slot?.endMinute ?? 1080,
      };
    }),
  );
  const [dirty, setDirty] = useState(false);
  const change = (i: number, patch: Partial<(typeof days)[number]>) => {
    setDays((list) => list.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
    setDirty(true);
  };
  const invalid = days.some((d) => d.open && d.endMinute <= d.startMinute);
  const save = useMutation({
    mutationFn: () =>
      api("/me/artisan/availability", {
        method: "PUT",
        body: {
          slots: days.flatMap((d, dayOfWeek) =>
            d.open ? [{ dayOfWeek, startMinute: d.startMinute, endMinute: d.endMinute }] : [],
          ),
        },
      }),
    onSuccess: () => {
      setDirty(false);
      toast.success("Working hours saved.");
      client.invalidateQueries({ queryKey: OWN_ARTISAN_KEY });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  return (
    <Card>
      <h2 className="text-lg font-extrabold">Working hours</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Shown on your profile so customers know when to expect you.
      </p>
      <ul className="mt-4 divide-y">
        {days.map((d, i) => (
          <li key={DAYS[i]} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
            <label className="flex min-h-10 w-36 cursor-pointer items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                className="size-5 accent-(--primary)"
                checked={d.open}
                onChange={(e) => change(i, { open: e.target.checked })}
              />
              {DAYS[i]}
            </label>
            {d.open ? (
              <div className="flex items-center gap-2 text-sm">
                <Select
                  aria-label={`${DAYS[i]} opening time`}
                  value={d.startMinute}
                  onChange={(e) => change(i, { startMinute: Number(e.target.value) })}
                  className="min-h-10 w-28 py-1.5"
                >
                  {TIMES.map((t) => (
                    <option key={t} value={t}>
                      {formatMinute(t)}
                    </option>
                  ))}
                </Select>
                to
                <Select
                  aria-label={`${DAYS[i]} closing time`}
                  value={d.endMinute}
                  invalid={d.endMinute <= d.startMinute}
                  onChange={(e) => change(i, { endMinute: Number(e.target.value) })}
                  className="min-h-10 w-28 py-1.5"
                >
                  {TIMES.map((t) => (
                    <option key={t} value={t}>
                      {formatMinute(t)}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Closed</span>
            )}
          </li>
        ))}
      </ul>
      {invalid && (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          Closing time must be after opening time.
        </p>
      )}
      <Button
        className="mt-4"
        variant="outline"
        disabled={!dirty || invalid || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending && <Spinner className="size-4" />} Save hours
      </Button>
    </Card>
  );
}

function PortfolioEditor({ photos }: { photos: Photo[] }) {
  const toast = useToast();
  const client = useQueryClient();
  const patch = (fn: (list: Photo[]) => Photo[]) =>
    client.setQueryData<OwnArtisanProfile | null>(OWN_ARTISAN_KEY, (old) =>
      old ? { ...old, portfolio: fn(old.portfolio) } : old,
    );
  const add = useMutation({
    mutationFn: async (file: File) => {
      const { key } = await uploadFile(file, "portfolio");
      return api<Photo>("/me/artisan/portfolio", { method: "POST", body: { storageKey: key } });
    },
    onSuccess: (photo) => patch((list) => [...list, photo]),
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/me/artisan/portfolio/${id}`, { method: "DELETE" }),
    onSuccess: (_d, id) => patch((list) => list.filter((p) => p.id !== id)),
    onError: (err) => toast.error(errorMessage(err)),
  });
  return (
    <Card>
      <h2 className="text-lg font-extrabold">Photos of your work</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Clear before-and-after photos win more jobs than anything you can write. Up to 24.
      </p>
      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <li key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- storage-provider URLs */}
            <img
              src={p.url}
              alt={p.caption ?? "Your work"}
              className="aspect-square w-full rounded-lg object-cover"
              loading="lazy"
            />
            <button
              type="button"
              aria-label="Remove photo"
              disabled={remove.isPending}
              onClick={() => remove.mutate(p.id)}
              className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-none bg-foreground/80 text-background hover:bg-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {photos.length < 24 && (
          <li>
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:bg-muted">
              {add.isPending ? <Spinner /> : <ImagePlus className="size-6" aria-hidden />}
              {add.isPending ? "Uploading" : "Add photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={add.isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) add.mutate(f);
                }}
              />
            </label>
          </li>
        )}
      </ul>
    </Card>
  );
}
