"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, EyeOff, ImagePlus, MapPin, X, Zap } from "lucide-react";
import { TrustBadge } from "@/components/artisan/trust";
import { LocationPicker } from "@/components/site/location-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, Avatar, Card, ErrorState, PageLoading, Spinner } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useRequireAuth } from "@/hooks/use-auth";
import { usePlace } from "@/hooks/use-place";
import { api, ApiError, errorMessage, uploadFile } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import { formatPriceRange } from "@/lib/locale";
import { type ArtisanProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = {
  categoryId: string;
  description: string;
  addressLine: string;
  landmark: string;
  timing: "now" | "later";
  scheduledFor: string;
  photos: { key: string; url: string }[];
};

const EMPTY: Draft = {
  categoryId: "",
  description: "",
  addressLine: "",
  landmark: "",
  timing: "now",
  scheduledFor: "",
  photos: [],
};
const STEPS = ["The problem", "Where and when", "Review and send"];
const MAX_PHOTOS = 6;

function loadDraft(key: string): Draft {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : EMPTY;
  } catch {
    // Gracefully fallback during Server-Side Rendering or strict privacy modes
    return EMPTY;
  }
}

export function BookingWizard({ artisanId }: { artisanId: string }) {
  const me = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const { place } = usePlace();
  const draftKey = `ogasabi-draft-${artisanId}`;

  // ==========================================
  // 1. ALL HOOKS GO AT THE TOP (Rules of Hooks)
  // ==========================================
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => loadDraft(draftKey));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const idempotencyKey = useRef("");

  const [minDate] = useState(() => {
    const time = Date.now() + 30 * 60_000 - new Date().getTimezoneOffset() * 60_000;
    return new Date(time).toISOString().slice(0, 16);
  });

  // Assign UUID on client mount to avoid SSR hydration mismatch
  useEffect(() => {
    if (!idempotencyKey.current && typeof crypto !== "undefined") {
      idempotencyKey.current = crypto.randomUUID();
    }
  }, []);

  // Auto-save draft changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      /* storage full or blocked: the form still works */
    }
  }, [draft, draftKey]);

  const artisan = useQuery({
    queryKey: ["artisan", artisanId],
    queryFn: () => api<ArtisanProfile>(`/artisans/${artisanId}`),
  });

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const categories = artisan.data?.categories ?? [];
  const categoryId = draft.categoryId || (categories.length === 1 ? (categories[0]?.id ?? "") : "");
  const area = place?.label.replace(/^Near /, "") ?? "";
  const distanceKm =
    place && artisan.data?.approxLat != null && artisan.data.approxLng != null
      ? haversineKm(artisan.data.approxLat, artisan.data.approxLng, place.lat, place.lng)
      : null;
  const outOfArea =
    distanceKm != null && artisan.data != null && distanceKm > artisan.data.serviceRadiusKm + 2;

  const submit = useMutation({
    mutationFn: () =>
      api<{ id: string }>("/requests", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey.current },
        body: {
          artisanId,
          categoryId,
          description: draft.description.trim(),
          addressLine: draft.addressLine.trim(),
          landmark: draft.landmark.trim() || undefined,
          areaLabel: area,
          city: place?.city || undefined,
          state: place?.state || undefined,
          lat: place?.lat,
          lng: place?.lng,
          isImmediate: draft.timing === "now",
          scheduledFor:
            draft.timing === "later" && draft.scheduledFor
              ? new Date(draft.scheduledFor).toISOString()
              : null,
          photoKeys: draft.photos.map((p) => p.key),
        },
      }),
    onSuccess: ({ id }) => {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      client.invalidateQueries({ queryKey: ["requests"] });
      router.replace(`/requests/${id}?sent=1`);
    },
    onError: (err) => {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        setErrors(err.fields);
        setStep(err.fields.description || err.fields.categoryId ? 0 : 1);
      }
      idempotencyKey.current = crypto.randomUUID();
    },
  });

  const validate = (which: number): boolean => {
    const next: Record<string, string> = {};
    if (which === 0) {
      if (!categoryId) next.categoryId = "Choose the kind of work";
      if (draft.description.trim().length < 20)
        next.description =
          "Describe the problem in at least 20 characters so the artisan can prepare";
    } else if (which === 1) {
      if (!place) next.area = "Choose the area where the work is needed";
      if (draft.addressLine.trim().length < 5) next.addressLine = "Enter the street address";
      if (draft.timing === "later") {
        const when = draft.scheduledFor ? new Date(draft.scheduledFor).getTime() : NaN;
        if (Number.isNaN(when)) next.scheduledFor = "Pick a date and time";
        else if (when < Date.now() + 30 * 60_000)
          next.scheduledFor = "Choose a time at least 30 minutes from now";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const go = (to: number) => {
    setStep(to);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - draft.photos.length;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        const uploaded = await uploadFile(file, "request");
        setDraft((d) => ({ ...d, photos: [...d.photos, uploaded] }));
      }
      if (files.length > room) toast.error(`You can attach up to ${MAX_PHOTOS} photos.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  // ==========================================
  // 2. EARLY RETURNS (Below all hooks)
  // ==========================================
  if (!me || artisan.isPending) return <PageLoading />;
  if (artisan.isError)
    return <ErrorState message={errorMessage(artisan.error)} onRetry={() => artisan.refetch()} />;

  const a = artisan.data;
  if (a.isOwner || a.status !== "ACTIVE") {
    return (
      <Alert
        tone="warning"
        title={
          a.isOwner ? "This is your own profile" : "This artisan is not taking requests right now"
        }
      >
        <Link href="/search" className="font-semibold text-primary underline">
          Find another artisan
        </Link>
      </Alert>
    );
  }

  // ==========================================
  // 3. MAIN RENDER
  // ==========================================
  return (
    <div className="space-y-6">
      <Link
        href={`/artisans/${a.id}`}
        className="flex items-center gap-3 p-3 card-surface hover:border-primary/40"
      >
        <Avatar name={a.businessName} src={a.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{a.businessName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {a.headline} · callout{" "}
            {formatPriceRange(a.calloutMinKobo, a.calloutMaxKobo) ?? "on request"}
          </p>
        </div>
        <TrustBadge tier={a.trustTier} score={a.trustScore} provisional={a.isProvisional} />
      </Link>

      <nav aria-label="Progress">
        <ol className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className="flex flex-1 flex-col gap-1.5"
              aria-current={i === step ? "step" : undefined}
            >
              <span className={cn("h-1.5 rounded-none", i <= step ? "bg-accent" : "bg-muted")} />
              <span
                className={cn(
                  "flex items-center gap-1 font-label text-xs font-bold",
                  i === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3.5 text-success" aria-hidden /> : `${i + 1}.`}
                <span className={cn(i !== step && "max-sm:sr-only")}>{label}</span>
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <Card>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-extrabold tracking-tight outline-none"
        >
          {step === 0 ? "What needs fixing?" : step === 1 ? "Where and when?" : "Check and send"}
        </h1>

        {step === 0 && (
          <div className="mt-5 space-y-5">
            {categories.length > 1 && (
              <Field label="Kind of work" htmlFor="categoryId" error={errors.categoryId}>
                <Select
                  id="categoryId"
                  value={categoryId}
                  invalid={!!errors.categoryId}
                  onChange={(e) => update({ categoryId: e.target.value })}
                >
                  <option value="">Choose…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field
              label="Describe the problem"
              htmlFor="description"
              error={errors.description}
              hint="What is happening, since when, and anything you have already tried."
            >
              <Textarea
                id="description"
                value={draft.description}
                maxLength={2000}
                invalid={!!errors.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="e.g. The sitting-room sockets trip the breaker whenever the AC is on. Started two days ago."
              />
            </Field>
            <div className="space-y-2">
              <p className="flex items-baseline justify-between text-sm font-semibold">
                Photos{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  Optional, up to {MAX_PHOTOS}
                </span>
              </p>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {draft.photos.map((p) => (
                  <li key={p.key} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- storage-provider URLs */}
                    <img
                      src={p.url}
                      alt="Attached photo"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() =>
                        update({ photos: draft.photos.filter((x) => x.key !== p.key) })
                      }
                      className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-none bg-foreground text-background shadow"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
                {draft.photos.length < MAX_PHOTOS && (
                  <li>
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:bg-muted">
                      {uploading ? <Spinner /> : <ImagePlus className="size-6" aria-hidden />}
                      {uploading ? "Uploading" : "Add photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        disabled={uploading}
                        onChange={(e) => {
                          void addPhotos(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-5 space-y-5">
            <Alert tone="info">
              <span className="inline-flex items-start gap-2">
                <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
                The artisan sees only your area until the job is accepted. Your street address and
                phone number are shared after that.
              </span>
            </Alert>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">Area</p>
              <button
                type="button"
                onClick={() => setPicker(true)}
                className="flex field items-center gap-2 text-left font-semibold"
              >
                <MapPin className="size-5 shrink-0 text-accent" aria-hidden />
                <span className="flex-1 truncate">
                  {place
                    ? `${place.label}${place.city ? `, ${place.city}` : ""}`
                    : "Choose your area"}
                </span>
                <span className="text-sm font-bold text-primary">Change</span>
              </button>
              {errors.area && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errors.area}
                </p>
              )}
              {outOfArea && (
                <Alert tone="warning">
                  This area is about {Math.round(distanceKm ?? 0)} km from {a.businessName}, who
                  travels up to {a.serviceRadiusKm} km. They may not be able to take the job.
                </Alert>
              )}
            </div>
            <Field label="Street address" htmlFor="addressLine" error={errors.addressLine}>
              <Input
                id="addressLine"
                autoComplete="street-address"
                value={draft.addressLine}
                maxLength={200}
                invalid={!!errors.addressLine}
                onChange={(e) => update({ addressLine: e.target.value })}
                placeholder="House number and street"
              />
            </Field>
            <Field
              label="Nearest landmark"
              htmlFor="landmark"
              optional
              hint="Helps the artisan find you: a junction, church, filling station."
            >
              <Input
                id="landmark"
                value={draft.landmark}
                maxLength={120}
                onChange={(e) => update({ landmark: e.target.value })}
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-semibold">When do you need them?</legend>
              {[
                {
                  value: "now" as const,
                  icon: Zap,
                  title: "As soon as possible",
                  body: "The artisan comes at their next free time.",
                },
                {
                  value: "later" as const,
                  icon: CalendarClock,
                  title: "At a set date and time",
                  body: "Pick a time that suits you.",
                },
              ].map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5",
                    draft.timing === o.value
                      ? "border-primary bg-primary-container/40"
                      : "border-border",
                  )}
                >
                  <input
                    type="radio"
                    name="timing"
                    className="mt-1 size-4 accent-(--primary)"
                    checked={draft.timing === o.value}
                    onChange={() => update({ timing: o.value })}
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-bold">
                      <o.icon className="size-4 text-secondary" aria-hidden /> {o.title}
                    </span>
                    <span className="block text-sm text-muted-foreground">{o.body}</span>
                  </span>
                </label>
              ))}
              {draft.timing === "later" && (
                <Field label="Date and time" htmlFor="scheduledFor" error={errors.scheduledFor}>
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    min={minDate}
                    value={draft.scheduledFor}
                    invalid={!!errors.scheduledFor}
                    onChange={(e) => update({ scheduledFor: e.target.value })}
                    suppressHydrationWarning
                  />
                </Field>
              )}
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-5">
            <dl className="divide-y rounded-xl border">
              <Row label="Work" onEdit={() => go(0)}>
                <p className="font-semibold">{categories.find((c) => c.id === categoryId)?.name}</p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">
                  {draft.description}
                </p>
                {draft.photos.length > 0 && (
                  <p className="mt-1 text-muted-foreground">
                    {draft.photos.length} photo(s) attached
                  </p>
                )}
              </Row>
              <Row label="Where" onEdit={() => go(1)}>
                <p className="font-semibold">{draft.addressLine}</p>
                <p className="text-muted-foreground">
                  {[draft.landmark, area, place?.city].filter(Boolean).join(" · ")}
                </p>
              </Row>
              <Row label="When" onEdit={() => go(1)}>
                <p className="font-semibold">
                  {draft.timing === "now"
                    ? "As soon as possible"
                    : draft.scheduledFor
                      ? formatDateTime(draft.scheduledFor)
                      : ""}
                </p>
              </Row>
            </dl>
            <div className="rounded-xl bg-muted p-4 text-sm">
              <p className="font-bold">What happens next</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>{a.businessName} is notified and can accept, send a quote, or decline.</li>
                <li>Nothing is booked, and nothing is owed, until you both agree.</li>
                <li>
                  If they do not respond in 24 hours the request expires and you can try someone
                  else.
                </li>
              </ol>
            </div>
            {submit.isError && <Alert tone="danger">{errorMessage(submit.error)}</Alert>}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step === 0 ? (
            <Link href={`/artisans/${a.id}`} className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </Link>
          ) : (
            <Button variant="outline" onClick={() => go(step - 1)} disabled={submit.isPending}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              variant="accent"
              disabled={uploading}
              onClick={() => validate(step) && go(step + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="accent"
              size="lg"
              disabled={submit.isPending}
              onClick={() => validate(0) && validate(1) && submit.mutate()}
            >
              {submit.isPending && <Spinner className="size-4" />} Send request
            </Button>
          )}
        </div>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        Your progress is saved on this device until you send the request.
      </p>
      <LocationPicker open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}

function Row({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 p-4 text-sm">
      <dt className="w-14 shrink-0 font-label text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
      <button
        type="button"
        onClick={onEdit}
        className="text-sm font-bold text-primary hover:underline"
      >
        Edit
      </button>
    </div>
  );
}
