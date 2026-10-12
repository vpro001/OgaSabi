"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Info, ChevronRight } from "lucide-react";

// Types
interface BookingRequest {
  problemDescription: string;
  issueTags: string[];
  photos: File[];
  locationDetails: string;
  accessNotes: string;
  isUrgent: boolean;
  scheduledAt: string | null;
  feeKobo: number;
  categoryId?: string;
}

// Step definitions
const STEPS = [
  { id: "describe", label: "Describe Problem", description: "What's wrong and photos" },
  { id: "location", label: "Location & Timing", description: "Where and when" },
  { id: "review", label: "Review & Escrow", description: "Confirm and secure payment" },
] as const;

type Step = (typeof STEPS)[number]["id"];

// Issue tags for AC problem
const AC_ISSUES = [
  "Not cooling",
  "Strange noise",
  "Water leaking",
  "Bad smell",
  "Not turning on",
  "High energy bill",
  "Thermostat issue",
  "Refrigerant leak",
  "Frozen coils",
  "Other",
];

export default function BookingFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read artisanId and requestId from URL if present
  const artisanId = searchParams?.get("artisanId") ?? undefined;
  const requestIdParam = searchParams?.get("requestId");
  const [currentStep, setCurrentStep] = useState<Step>("describe");

  // Lazy initializer for draft to avoid setState in useEffect
  const [draft, setDraft] = useState<BookingRequest>(() => {
    const saved = localStorage.getItem(`booking-draft-${artisanId ?? "new"}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          problemDescription: "",
          issueTags: [],
          photos: [],
          locationDetails: "",
          accessNotes: "",
          isUrgent: false,
          scheduledAt: null,
          feeKobo: 5_000_00,
          ...parsed,
        };
      } catch {}
    }
    return {
      problemDescription: "",
      issueTags: [],
      photos: [],
      locationDetails: "",
      accessNotes: "",
      isUrgent: false,
      scheduledAt: null,
      feeKobo: 5_000_00,
    };
  });

  // Save draft to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`booking-draft-${artisanId ?? "new"}`, JSON.stringify(draft));
  }, [draft, artisanId]);

  const updateDraft = (update: Partial<BookingRequest>) => {
    setDraft((prev) => ({ ...prev, ...update }));
  };

  const nextStep = () =>
    setCurrentStep(STEPS[STEPS.findIndex((s) => s.id === currentStep) + 1]?.id ?? "review");
  const prevStep = () =>
    setCurrentStep(STEPS[STEPS.findIndex((s) => s.id === currentStep) - 1]?.id ?? "describe");

  const mutation = useMutation({
    mutationFn: async (data: BookingRequest) => {
      const res = await fetch("/api/v1/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artisanId,
          problemDescription: data.problemDescription,
          issueTags: data.issueTags,
          locationDetails: data.locationDetails,
          accessNotes: data.accessNotes,
          isUrgent: data.isUrgent,
          scheduledAt: data.scheduledAt,
          categoryId: data.categoryId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to create request");
      }
      return res.json();
    },
    onSuccess: () => {
      localStorage.removeItem(`booking-draft-${artisanId ?? "new"}`);
      router.push("/booking/success");
    },
    onError: (error) => {
      console.error("Booking failed:", error);
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Progress indicator */}
      <nav aria-label="Progress" className="mb-12">
        <ol className="flex items-center justify-center gap-4">
          {STEPS.map((step, index) => (
            <li key={step.id} className="flex items-center">
              <div className="flex min-w-max items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 font-semibold",
                    currentStep === step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : index < STEPS.findIndex((s) => s.id === currentStep)
                        ? "border-success bg-success text-success-foreground"
                        : "border-muted bg-background text-muted-foreground",
                  )}
                >
                  {index + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:inline",
                    currentStep === step.id ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <ChevronRight className="mx-4 h-4 w-4 text-muted-foreground" />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step title */}
      <div className="mb-8">
        <h1 className="font-display text-h1">Booking Request #{requestIdParam ?? "OGS-88219"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Step {STEPS.findIndex((s) => s.id === currentStep) + 1} of {STEPS.length}:{" "}
          {STEPS[STEPS.findIndex((s) => s.id === currentStep)]?.description}
        </p>
      </div>

      {/* Step content */}
      <div className="rounded-xl border bg-card p-6">
        {currentStep === "describe" && renderStepDescribe()}
        {currentStep === "location" && renderStepLocation()}
        {currentStep === "review" && renderStepReview()}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <Button
          variant={currentStep === "describe" ? "ghost" : "default"}
          onClick={prevStep}
          disabled={currentStep === "describe"}
        >
          {currentStep === "describe" ? "Cancel" : "Back"}
        </Button>
        {currentStep !== "review" && (
          <Button variant="accent" onClick={nextStep} disabled={!canProceed(currentStep)}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );

  function canProceed(step: Step): boolean {
    switch (step) {
      case "describe":
        return draft.problemDescription.trim().length > 0;
      case "location":
        return draft.locationDetails.trim().length > 0;
      case "review":
        return true;
      default:
        return false;
    }
  }

  function renderStepDescribe() {
    return (
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium">Select Nature of the Problem</label>
          <div className="flex flex-wrap gap-3">
            {AC_ISSUES.map((issue) => (
              <label key={issue} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.issueTags.includes(issue)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...draft.issueTags, issue]
                      : draft.issueTags.filter((t) => t !== issue);
                    updateDraft({ issueTags: updated });
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">{issue}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="problem-description" className="mb-2 block text-sm font-medium">
            Describe the problem in detail
          </label>
          <textarea
            id="problem-description"
            value={draft.problemDescription}
            onChange={(e) => updateDraft({ problemDescription: e.target.value })}
            className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            placeholder="Describe your AC issue in detail..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Upload Photos</label>
          <label className="flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-center transition-colors hover:bg-muted">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => updateDraft({ photos: Array.from(e.target.files ?? []) })}
              className="hidden"
            />
            <div>
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 118 0M7 16l4-4 3 3m-3-3V3v18"
                />
              </svg>
              <span className="mt-2 block text-sm text-muted-foreground">
                {draft.photos.length > 0
                  ? `${draft.photos.length} photo(s) selected`
                  : "Click to upload photos"}
              </span>
            </div>
          </label>
          {draft.photos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {draft.photos.map((photo, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={idx}
                  src={URL.createObjectURL(photo)}
                  alt={`Upload ${idx + 1}`}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderStepLocation() {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-lg bg-info/10 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-info" />
          <p className="text-sm text-info">
            Your exact address is cloaked until an artisan accepts your request. They&apos;ll only
            see your area name and a rounded distance initially.
          </p>
        </div>

        <div>
          <label htmlFor="location-details" className="mb-2 block text-sm font-medium">
            Location & Access Details
          </label>
          <textarea
            id="location-details"
            value={draft.locationDetails}
            onChange={(e) => updateDraft({ locationDetails: e.target.value })}
            className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            placeholder="Where is the work needed? Building, floor, gate code, etc."
          />
        </div>

        <div className="space-y-4">
          <label className="mb-2 block text-sm font-medium">Access Notes (optional)</label>
          <input
            type="text"
            value={draft.accessNotes}
            onChange={(e) => updateDraft({ accessNotes: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            placeholder="e.g. Gate code 1234, call on arrival"
          />
        </div>

        <div className="space-y-4">
          <fieldset className="space-y-3">
            <legend className="mb-2 block text-sm font-medium">Preferred Dispatch Timing</legend>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="timing"
                checked={draft.isUrgent}
                onChange={() => updateDraft({ isUrgent: true, scheduledAt: null })}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium">I need someone urgently — dispatch immediately</p>
                <p className="text-sm text-muted-foreground">Emergency rates may apply.</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="timing"
                checked={!draft.isUrgent}
                onChange={() => updateDraft({ isUrgent: false })}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <div className="flex flex-col gap-2">
                <p className="font-medium">Schedule for later</p>
                <input
                  type="datetime-local"
                  value={draft.scheduledAt ?? ""}
                  onChange={(e) => updateDraft({ scheduledAt: e.target.value })}
                  className="rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>
            </label>
          </fieldset>
        </div>
      </div>
    );
  }

  function renderStepReview() {
    // Calculate total escrow hold
    const calloutFee = Math.max(draft.feeKobo, 5_000_00);
    const subtotal = calloutFee;

    return (
      <div className="space-y-8">
        {/* Summary of selections */}
        <div className="space-y-4">
          <h3 className="font-display text-h2">Review your details</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Problem Description</dt>
              <dd className="mt-1 text-foreground">{draft.problemDescription}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Issues Tagged</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {draft.issueTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
                {draft.issueTags.length === 0 && (
                  <span className="text-muted-foreground">None</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Photos</dt>
              <dd className="mt-1 text-foreground">{draft.photos.length} photo(s)</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="mt-1 text-foreground">{draft.locationDetails || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Timing</dt>
              <dd className="mt-1 text-foreground">
                {draft.isUrgent
                  ? "Urgent — dispatch immediately"
                  : draft.scheduledAt
                    ? `Scheduled: ${new Date(draft.scheduledAt).toLocaleString()}`
                    : "Not specified"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Escrow summary */}
        <div className="rounded-xl border bg-muted/50 p-6">
          <h3 className="font-display mb-4 text-h2">Initial Callout & Diagnostics Fee</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Callout fee</span>
              <span>₦{(calloutFee / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Diagnostics deposit</span>
              <span>₦{(subtotal / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Total Escrow Hold</span>
              <span>₦{(subtotal / 100).toLocaleString()}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            This amount is held in escrow and only released to the artisan after work completion.
            Unused portions are returned automatically.
          </p>
        </div>

        {/* Terms */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="terms"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            defaultChecked
          />
          <label htmlFor="terms" className="text-sm">
            I agree to the{" "}
            <a href="/terms" className="text-primary hover:underline">
              Terms and Conditions
            </a>{" "}
            and understand my payment is protected.
          </label>
        </div>

        <Button
          variant="accent"
          size="lg"
          className="w-full"
          onClick={() => mutation.mutate(draft)}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Securing escrow…" : "Continue to Review & Secure Escrow"}
        </Button>
      </div>
    );
  }
}
