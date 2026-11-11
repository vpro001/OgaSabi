"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";

const REASONS = [
  ["FAKE_PROFILE", "Fake or misleading profile"],
  ["FAKE_REVIEW", "Fake review"],
  ["FRAUD", "Fraud or scam"],
  ["HARASSMENT", "Harassment or abuse"],
  ["INAPPROPRIATE_CONTENT", "Inappropriate content"],
  ["SPAM", "Spam"],
  ["OTHER", "Something else"],
] as const;

export function ReportDialog({
  target,
  onClose,
}: {
  target: { type: "USER" | "REVIEW" | "MESSAGE"; id: string } | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState<string>("FRAUD");
  const [details, setDetails] = useState("");
  const submit = useMutation({
    mutationFn: () =>
      api("/reports", {
        method: "POST",
        body: {
          targetType: target?.type,
          targetId: target?.id,
          reason,
          details: details || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Thank you. Our team will review this report.");
      setDetails("");
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title="Report a problem"
      description="Reports are confidential. We review every one."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <Field label="What is wrong?" htmlFor="report-reason">
          <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Details"
          htmlFor="report-details"
          optional
          hint="Anything that helps us understand what happened."
        >
          <Textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={submit.isPending}>
            Send report
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
