"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, FileCheck2, Hourglass, Lock, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, Card, ErrorState, PageLoading, Spinner } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ME_KEY, useRequireAuth } from "@/hooks/use-auth";
import { OWN_ARTISAN_KEY, useOwnArtisan } from "@/hooks/use-own-artisan";
import { api, errorMessage, uploadFile } from "@/lib/api";
import { formatDate, VERIFICATION_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

const ID_TYPES = [
  ["NIN", "National Identity Number (NIN) slip or card"],
  ["DRIVERS_LICENCE", "Driver's licence"],
  ["VOTERS_CARD", "Voter's card (PVC)"],
  ["INTERNATIONAL_PASSPORT", "International passport"],
] as const;

type Uploaded = { key: string; name: string } | null;

export function Verification() {
  const me = useRequireAuth("artisan");
  const params = useSearchParams();
  const toast = useToast();
  const client = useQueryClient();
  const profile = useOwnArtisan(!!me);
  const [idType, setIdType] = useState<string>("NIN");
  const [number, setNumber] = useState("");
  const [document, setDocument] = useState<Uploaded>(null);
  const [selfie, setSelfie] = useState<Uploaded>(null);
  const [uploading, setUploading] = useState<"document" | "selfie" | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      api("/me/artisan/verification", {
        method: "POST",
        body: {
          idType,
          documentNumber: number,
          documentKey: document?.key,
          selfieKey: selfie?.key,
        },
      }),
    onSuccess: () => {
      toast.success("Documents submitted for review.");
      client.invalidateQueries({ queryKey: OWN_ARTISAN_KEY });
      client.invalidateQueries({ queryKey: ME_KEY });
    },
  });

  if (!me || profile.isPending) return <PageLoading />;
  if (profile.isError || !profile.data)
    return (
      <ErrorState
        message={profile.error ? errorMessage(profile.error) : "Profile not found."}
        onRetry={() => profile.refetch()}
      />
    );
  const p = profile.data;
  const v = p.verification;

  const pick = async (which: "document" | "selfie", file: File | undefined) => {
    if (!file) return;
    setUploading(which);
    try {
      const { key } = await uploadFile(file, "verification");
      (which === "document" ? setDocument : setSelfie)({ key, name: file.name });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(null);
    }
  };

  if (v?.status === "PENDING") {
    return (
      <Card className="text-center">
        <Hourglass className="mx-auto size-10 text-warning" aria-hidden />
        <h2 className="mt-3 text-xl font-extrabold">We are reviewing your documents</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Submitted {formatDate(v.createdAt)}. Reviews usually take up to two working days. You will
          get a notification as soon as there is a decision, and you can keep taking jobs in the
          meantime.
        </p>
        <Link href="/artisan" className={cn(buttonVariants(), "mt-5")}>
          Back to dashboard
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {params.get("welcome") === "1" && (
        <Alert tone="success" title="Your profile is live">
          One more step makes a big difference: verified artisans earn up to 15 extra trust points.
          You can also do this later.
        </Alert>
      )}
      {p.verificationLevel !== "NONE" && (
        <Alert tone="success" title={VERIFICATION_LABEL[p.verificationLevel]}>
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="size-4" aria-hidden /> Your verified badge is showing on your
            profile. Add a selfie below to reach the next level.
          </span>
        </Alert>
      )}
      {v?.status === "REJECTED" && (
        <Alert tone="danger" title="Your last submission was not accepted">
          {v.rejectionReason ?? "The documents could not be verified."} Please submit again below.
        </Alert>
      )}

      <Card>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <Field label="Type of ID" htmlFor="idType">
            <Select id="idType" value={idType} onChange={(e) => setIdType(e.target.value)}>
              {ID_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="ID number"
            htmlFor="idNumber"
            hint="Exactly as printed. We keep only the last 4 characters and a one-way fingerprint, never the full number."
          >
            <Input
              id="idNumber"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              autoComplete="off"
              maxLength={24}
              className="font-label tracking-wider"
            />
          </Field>
          <FilePick
            label="Photo of the ID"
            hint="Clear, all four corners visible. JPG, PNG or PDF."
            file={document}
            busy={uploading === "document"}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onPick={(f) => pick("document", f)}
          />
          <FilePick
            label="Selfie holding the ID"
            hint="Optional, but needed for the higher “ID and selfie verified” level."
            file={selfie}
            busy={uploading === "selfie"}
            accept="image/jpeg,image/png,image/webp"
            capture
            onPick={(f) => pick("selfie", f)}
          />
          <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            Your documents are stored privately and can only be opened by OgaSabi reviewers through
            links that expire in minutes. They are never shown to customers.
          </p>
          {submit.isError && <Alert tone="danger">{errorMessage(submit.error)}</Alert>}
          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={!document || number.trim().length < 6 || submit.isPending || !!uploading}
          >
            {submit.isPending && <Spinner className="size-4" />} Submit for review
          </Button>
        </form>
      </Card>
    </div>
  );
}

function FilePick({
  label,
  hint,
  file,
  busy,
  accept,
  capture,
  onPick,
}: {
  label: string;
  hint: string;
  file: Uploaded;
  busy: boolean;
  accept: string;
  capture?: boolean;
  onPick: (file: File | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold">{label}</p>
      <label
        className={cn(
          "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-semibold hover:bg-muted",
          file && "border-solid border-success/50 bg-success/5",
        )}
      >
        {busy ? (
          <Spinner />
        ) : file ? (
          <FileCheck2 className="size-6 shrink-0 text-success" aria-hidden />
        ) : (
          <Upload className="size-6 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate">
          {busy ? "Uploading…" : file ? file.name : "Choose a file or take a photo"}
        </span>
        {file && !busy && <span className="text-primary">Replace</span>}
        <input
          type="file"
          accept={accept}
          capture={capture ? "user" : undefined}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
