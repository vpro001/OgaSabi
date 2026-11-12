"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Star } from "lucide-react";
import { CategoryIcon } from "@/components/artisan/category-icon";
import { LocationPicker } from "@/components/site/location-picker";
import { Button } from "@/components/ui/button";
import { Alert, Card, Spinner } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ME_KEY } from "@/hooks/use-auth";
import { type SavedPlace } from "@/hooks/use-place";
import { api, ApiError, errorMessage } from "@/lib/api";
import { artisanProfileSchema } from "@/lib/schemas";
import { type Category, type OwnArtisanProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type State = {
  businessName: string;
  bio: string;
  yearsExperience: string;
  categoryIds: string[];
  primaryCategoryId: string;
  place: { label: string; city: string; state: string; lat: number; lng: number } | null;
  serviceRadiusKm: number;
  calloutMin: string;
  calloutMax: string;
  whatsappNumber: string;
};

const naira = (kobo: number | null) => (kobo == null ? "" : String(kobo / 100));
const toKobo = (value: string) =>
  value.trim() === "" ? null : Math.round(Number(value.replace(/[^\d.]/g, "")) * 100);

export function ProfileForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial: OwnArtisanProfile | null;
  submitLabel: string;
  onSaved: (p: OwnArtisanProfile) => void;
}) {
  const client = useQueryClient();
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [s, setS] = useState<State>(() => ({
    businessName: initial?.businessName ?? "",
    bio: initial?.bio ?? "",
    yearsExperience: initial ? String(initial.yearsExperience) : "",
    categoryIds: initial?.categoryIds ?? [],
    primaryCategoryId: initial?.primaryCategoryId ?? "",
    place:
      initial?.lat != null && initial.lng != null
        ? {
            label: initial.areaLabel,
            city: initial.city,
            state: initial.state,
            lat: initial.lat,
            lng: initial.lng,
          }
        : null,
    serviceRadiusKm: initial?.serviceRadiusKm ?? 10,
    calloutMin: naira(initial?.calloutMinKobo ?? null),
    calloutMax: naira(initial?.calloutMaxKobo ?? null),
    whatsappNumber: initial?.whatsappNumber ?? "",
  }));
  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }));
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
    staleTime: 600_000,
  });

  const save = useMutation({
    mutationFn: (body: unknown) => api<OwnArtisanProfile>("/me/artisan", { method: "PUT", body }),
    onSuccess: (profile) => {
      client.setQueryData(["me", "artisan"], profile);
      client.invalidateQueries({ queryKey: ME_KEY });
      onSaved(profile);
    },
    onError: (err) => {
      if (err instanceof ApiError) setErrors(err.fields);
    },
  });

  const toggleCategory = (id: string) => {
    const has = s.categoryIds.includes(id);
    if (!has && s.categoryIds.length >= 5) return;
    const categoryIds = has ? s.categoryIds.filter((c) => c !== id) : [...s.categoryIds, id];
    set({
      categoryIds,
      primaryCategoryId: categoryIds.includes(s.primaryCategoryId)
        ? s.primaryCategoryId
        : (categoryIds[0] ?? ""),
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = {
      businessName: s.businessName,
      bio: s.bio,
      yearsExperience: Number(s.yearsExperience || 0),
      categoryIds: s.categoryIds,
      primaryCategoryId: s.primaryCategoryId,
      areaLabel: s.place?.label.replace(/^Near /, "") ?? "",
      city: s.place?.city ?? "",
      state: s.place?.state ?? "",
      lat: s.place?.lat,
      lng: s.place?.lng,
      serviceRadiusKm: s.serviceRadiusKm,
      calloutMinKobo: toKobo(s.calloutMin),
      calloutMaxKobo: toKobo(s.calloutMax),
      whatsappNumber: s.whatsappNumber || undefined,
    };
    const parsed = artisanProfileSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0] ?? "_")] ??= issue.message;
      if (!s.place) next.place = "Choose the area you work from";
      setErrors(next);
      document.querySelector<HTMLElement>("[aria-invalid='true'], [data-error='true']")?.focus();
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };
  const placeError = errors.place ?? errors.areaLabel ?? errors.city ?? errors.lat;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold">Your business</h2>
        <div className="mt-4 space-y-4">
          <Field
            label="Business or trading name"
            htmlFor="businessName"
            error={errors.businessName}
            hint="What customers will see, e.g. “Briggs Electrical Works”."
          >
            <Input
              id="businessName"
              value={s.businessName}
              maxLength={80}
              invalid={!!errors.businessName}
              onChange={(e) => set({ businessName: e.target.value })}
            />
          </Field>
          <Field
            label="About your work"
            htmlFor="bio"
            error={errors.bio}
            hint={`${s.bio.trim().length}/1500 · What you specialise in, your training, and how you work. At least 40 characters.`}
          >
            <Textarea
              id="bio"
              value={s.bio}
              maxLength={1500}
              invalid={!!errors.bio}
              onChange={(e) => set({ bio: e.target.value })}
            />
          </Field>
          <Field
            label="Years of experience"
            htmlFor="yearsExperience"
            error={errors.yearsExperience}
            className="max-w-40"
          >
            <Input
              id="yearsExperience"
              inputMode="numeric"
              value={s.yearsExperience}
              invalid={!!errors.yearsExperience}
              onChange={(e) =>
                set({ yearsExperience: e.target.value.replace(/\D/g, "").slice(0, 2) })
              }
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold">Your trades</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose up to 5, then tap the star on your main one. Customers find you by trade.
        </p>
        {categories.isPending ? (
          <Spinner className="mt-4" />
        ) : (
          <ul
            className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"
            data-error={!!errors.categoryIds || undefined}
            tabIndex={errors.categoryIds ? -1 : undefined}
          >
            {categories.data?.map((c) => {
              const on = s.categoryIds.includes(c.id);
              const primary = s.primaryCategoryId === c.id;
              return (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-center rounded-xl border-2",
                    on ? "border-primary bg-primary-container/40" : "border-border",
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCategory(c.id)}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-3 text-left text-sm font-semibold"
                  >
                    <CategoryIcon iconKey={c.iconKey} className="size-4 shrink-0 text-secondary" />
                    <span className="truncate">{c.name}</span>
                  </button>
                  {on && (
                    <button
                      type="button"
                      aria-pressed={primary}
                      aria-label={`Make ${c.name} your main trade`}
                      onClick={() => set({ primaryCategoryId: c.id })}
                      className="flex size-11 items-center justify-center"
                    >
                      <Star
                        className={cn(
                          "size-5",
                          primary ? "fill-accent text-accent" : "text-muted-foreground",
                        )}
                        aria-hidden
                      />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {(errors.categoryIds || errors.primaryCategoryId) && (
          <p role="alert" className="mt-2 text-sm font-medium text-destructive">
            {errors.categoryIds ?? errors.primaryCategoryId}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold">Where you work</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customers see your area, never your exact address.
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Base area</p>
            <button
              type="button"
              onClick={() => setPicker(true)}
              data-error={!!placeError || undefined}
              className="flex field items-center gap-2 text-left font-semibold"
            >
              <MapPin className="size-5 shrink-0 text-accent" aria-hidden />
              <span className="flex-1 truncate">
                {s.place
                  ? [s.place.label, s.place.city].filter(Boolean).join(", ")
                  : "Choose your area"}
              </span>
              <span className="text-sm font-bold text-primary">
                {s.place ? "Change" : "Choose"}
              </span>
            </button>
            {placeError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {placeError}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="radius" className="flex justify-between text-sm font-semibold">
              How far will you travel? <span className="tabular-nums">{s.serviceRadiusKm} km</span>
            </label>
            <input
              id="radius"
              type="range"
              min={1}
              max={50}
              value={s.serviceRadiusKm}
              onChange={(e) => set({ serviceRadiusKm: Number(e.target.value) })}
              className="w-full accent-(--primary)"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold">Callout fee and contact</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The callout fee covers coming out and diagnosing the fault. You quote for the actual work
          on each job.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="From (₦)" htmlFor="calloutMin" error={errors.calloutMinKobo} optional>
            <Input
              id="calloutMin"
              inputMode="numeric"
              value={s.calloutMin}
              invalid={!!errors.calloutMinKobo}
              onChange={(e) => set({ calloutMin: e.target.value })}
              placeholder="3000"
            />
          </Field>
          <Field label="Up to (₦)" htmlFor="calloutMax" error={errors.calloutMaxKobo} optional>
            <Input
              id="calloutMax"
              inputMode="numeric"
              value={s.calloutMax}
              invalid={!!errors.calloutMaxKobo}
              onChange={(e) => set({ calloutMax: e.target.value })}
              placeholder="8000"
            />
          </Field>
        </div>
        <Field
          label="WhatsApp number"
          htmlFor="whatsappNumber"
          error={errors.whatsappNumber}
          optional
          hint="Shared with a customer only after you accept their job."
          className="mt-4"
        >
          <Input
            id="whatsappNumber"
            type="tel"
            inputMode="tel"
            value={s.whatsappNumber}
            invalid={!!errors.whatsappNumber}
            onChange={(e) => set({ whatsappNumber: e.target.value })}
          />
        </Field>
      </Card>

      {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full sm:w-auto"
        disabled={save.isPending}
      >
        {save.isPending && <Spinner className="size-4" />} {submitLabel}
      </Button>

      <LocationPicker
        open={picker}
        onClose={() => setPicker(false)}
        onPicked={(p: SavedPlace) => set({ place: p })}
      />
    </form>
  );
}
