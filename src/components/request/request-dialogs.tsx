"use client";

import { useState } from "react";
import { Paperclip, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { errorMessage, uploadFile } from "@/lib/api";
import { humanize } from "@/lib/format";
import { formatMoney } from "@/lib/locale";
import { COMPLAINT_CATEGORIES, REVIEW_TAGS } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Base = { open: boolean; onClose: () => void; pending: boolean; error?: string | null };

function Footer({
  onClose,
  pending,
  label,
  variant = "default",
  disabled,
}: {
  onClose: () => void;
  pending: boolean;
  label: string;
  variant?: "default" | "accent" | "destructive";
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="ghost" onClick={onClose} disabled={pending}>
        Back
      </Button>
      <Button type="submit" variant={variant} disabled={pending || disabled}>
        {pending && <Spinner className="size-4" />} {label}
      </Button>
    </div>
  );
}

/** A reason-only dialog used for declining, cancelling and rejecting a quote. */
export function ReasonDialog({
  open,
  onClose,
  pending,
  error,
  title,
  description,
  label,
  submitLabel,
  required = true,
  suggestions = [],
  onSubmit,
}: Base & {
  title: string;
  description?: string;
  label: string;
  submitLabel: string;
  required?: boolean;
  suggestions?: string[];
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason.trim());
        }}
      >
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setReason(s)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-sm font-medium",
                  reason === s ? "border-primary bg-primary-container/50" : "hover:bg-muted",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <Field label={label} htmlFor="reason" optional={!required}>
          <Textarea
            id="reason"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-20"
          />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <Footer
          onClose={onClose}
          pending={pending}
          label={submitLabel}
          variant="destructive"
          disabled={required && reason.trim().length < 3}
        />
      </form>
    </Dialog>
  );
}

export function QuoteDialog({
  open,
  onClose,
  pending,
  error,
  onSubmit,
}: Base & { onSubmit: (amountKobo: number, note: string) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const naira = Number(amount.replace(/[^\d]/g, ""));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Send a quote"
      description="Give one total price for the job. The customer must accept it before the job is booked."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(naira * 100, note.trim());
        }}
      >
        <Field
          label="Total price (₦)"
          htmlFor="quote-amount"
          hint={
            naira >= 500 ? `The customer will see ${formatMoney(naira * 100)}.` : "Minimum ₦500."
          }
        >
          <Input
            id="quote-amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="15000"
            className="text-lg font-bold tabular-nums"
          />
        </Field>
        <Field
          label="What the price covers"
          htmlFor="quote-note"
          optional
          hint="Parts, labour, how long it will take."
        >
          <Textarea
            id="quote-note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-20"
          />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <Footer
          onClose={onClose}
          pending={pending}
          label="Send quote"
          variant="accent"
          disabled={naira < 500}
        />
      </form>
    </Dialog>
  );
}

export function CompleteDialog({
  open,
  onClose,
  pending,
  error,
  quotedKobo,
  onSubmit,
}: Base & { quotedKobo: number | null; onSubmit: (finalAmountKobo: number | undefined) => void }) {
  const [amount, setAmount] = useState(quotedKobo ? String(quotedKobo / 100) : "");
  const naira = Number(amount.replace(/[^\d]/g, ""));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mark the job as complete"
      description="The customer will be asked to confirm. The job counts towards your trust score once they do."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(amount.trim() ? naira * 100 : undefined);
        }}
      >
        <Field
          label="Final amount charged (₦)"
          htmlFor="final-amount"
          optional
          hint="Recorded on the job so both sides have the same figure."
        >
          <Input
            id="final-amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg font-bold tabular-nums"
          />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <Footer onClose={onClose} pending={pending} label="Mark complete" variant="accent" />
      </form>
    </Dialog>
  );
}

export function ReviewDialog({
  open,
  onClose,
  pending,
  error,
  artisanName,
  onSubmit,
}: Base & {
  artisanName: string;
  onSubmit: (v: { rating: number; tags: string[]; comment?: string }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const labels = ["", "Poor", "Below average", "Okay", "Good", "Excellent"];
  const shownTags = REVIEW_TAGS.filter((t) =>
    rating >= 4 ? !["LATE", "OVERPRICED", "MESSY", "POOR_COMMUNICATION"].includes(t) : true,
  );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`How was ${artisanName}?`}
      description="Your review is public and helps other customers. It cannot be edited later."
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            rating,
            tags: tags.filter((t) => (shownTags as readonly string[]).includes(t)),
            comment: comment.trim() || undefined,
          });
        }}
      >
        <fieldset>
          <legend className="sr-only">Rating</legend>
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer p-1" onMouseEnter={() => setHover(n)}>
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  className="peer sr-only"
                />
                <Star
                  className={cn(
                    "size-9 transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-ring",
                    n <= (hover || rating) ? "fill-accent text-accent" : "fill-muted text-muted",
                  )}
                  aria-hidden
                />
                <span className="sr-only">
                  {n} {n === 1 ? "star" : "stars"}
                </span>
              </label>
            ))}
            <span className="ml-2 text-sm font-bold">{labels[hover || rating]}</span>
          </div>
        </fieldset>
        {rating > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">What stood out?</p>
            <div className="flex flex-wrap gap-2">
              {shownTags.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setTags((list) =>
                        on ? list.filter((x) => x !== t) : list.length < 6 ? [...list, t] : list,
                      )
                    }
                    className={cn(
                      "min-h-9 rounded-full border px-3 text-sm font-medium",
                      on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    {humanize(t)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Field label="Tell others about the job" htmlFor="review-comment" optional>
          <Textarea
            id="review-comment"
            value={comment}
            maxLength={1500}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Was the fault fixed? Was the price fair? Would you hire them again?"
          />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <Footer
          onClose={onClose}
          pending={pending}
          label="Post review"
          variant="accent"
          disabled={rating === 0}
        />
      </form>
    </Dialog>
  );
}

function EvidencePicker({
  keys,
  onChange,
}: {
  keys: { key: string; name: string }[];
  onChange: (next: { key: string; name: string }[]) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <p className="flex items-baseline justify-between text-sm font-semibold">
        Evidence{" "}
        <span className="text-xs font-normal text-muted-foreground">
          Optional: photos or PDF, up to 5
        </span>
      </p>
      {keys.map((k) => (
        <p key={k.key} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <Paperclip className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 truncate">{k.name}</span>
          <button
            type="button"
            aria-label={`Remove ${k.name}`}
            onClick={() => onChange(keys.filter((x) => x.key !== k.key))}
          >
            <X className="size-4" aria-hidden />
          </button>
        </p>
      ))}
      {keys.length < 5 && (
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 text-sm font-semibold hover:bg-muted">
          {busy ? <Spinner className="size-4" /> : <Paperclip className="size-4" aria-hidden />}{" "}
          Attach a file
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              try {
                const { key } = await uploadFile(file, "evidence");
                onChange([...keys, { key, name: file.name }]);
              } catch (err) {
                toast.error(errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      )}
    </div>
  );
}

export function DisputeDialog({
  open,
  onClose,
  pending,
  error,
  onSubmit,
}: Base & {
  onSubmit: (v: { reason: string; description: string; evidenceKeys: string[] }) => void;
}) {
  const [reason, setReason] = useState("Work not done properly");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<{ key: string; name: string }[]>([]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Open a dispute"
      description="The job is paused and our team reviews both sides. Use this when you cannot settle it with the other person directly."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            reason,
            description: description.trim(),
            evidenceKeys: files.map((f) => f.key),
          });
        }}
      >
        <Field label="What is the dispute about?" htmlFor="dispute-reason">
          <Select id="dispute-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {[
              "Work not done properly",
              "Job not finished",
              "Price is not what we agreed",
              "Damage to property",
              "Customer has not paid",
              "Other",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field
          label="What happened?"
          htmlFor="dispute-description"
          hint="Stick to facts: what was agreed, what was done, and what you want to happen."
        >
          <Textarea
            id="dispute-description"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <EvidencePicker keys={files} onChange={setFiles} />
        {error && <Alert tone="danger">{error}</Alert>}
        <Footer
          onClose={onClose}
          pending={pending}
          label="Open dispute"
          variant="destructive"
          disabled={description.trim().length < 20}
        />
      </form>
    </Dialog>
  );
}

export function ComplaintDialog({
  open,
  onClose,
  pending,
  error,
  isCustomer,
  onSubmit,
}: Base & {
  isCustomer: boolean;
  onSubmit: (v: { category: string; description: string; evidenceKeys: string[] }) => void;
}) {
  const options = COMPLAINT_CATEGORIES.filter((c) =>
    isCustomer
      ? c !== "NON_PAYMENT"
      : ["NON_PAYMENT", "RUDE_BEHAVIOUR", "FRAUD", "NO_SHOW", "OTHER"].includes(c),
  );
  const [category, setCategory] = useState<string>(options[0] ?? "OTHER");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<{ key: string; name: string }[]>([]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="File a complaint"
      description="Complaints are reviewed by our team. An upheld complaint affects the other person's standing on OgaSabi."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            category,
            description: description.trim(),
            evidenceKeys: files.map((f) => f.key),
          });
        }}
      >
        <Field label="Type of complaint" htmlFor="complaint-category">
          <Select
            id="complaint-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {options.map((c) => (
              <option key={c} value={c}>
                {humanize(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="What happened?"
          htmlFor="complaint-description"
          hint="At least 20 characters."
        >
          <Textarea
            id="complaint-description"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <EvidencePicker keys={files} onChange={setFiles} />
        {error && <Alert tone="danger">{error}</Alert>}
        <Footer
          onClose={onClose}
          pending={pending}
          label="Submit complaint"
          variant="destructive"
          disabled={description.trim().length < 20}
        />
      </form>
    </Dialog>
  );
}
