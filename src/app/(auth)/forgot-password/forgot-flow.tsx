"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { api } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/schemas";
import { type z } from "zod";

type Step1 = z.infer<typeof forgotPasswordSchema>;
type Step2 = z.infer<typeof resetPasswordSchema>;

/** Two steps on one page: ask for a code, then enter it with the new password. */
export function ForgotPasswordFlow() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const first = useForm<Step1>({ resolver: zodResolver(forgotPasswordSchema) });
  const second = useForm<Step2>({ resolver: zodResolver(resetPasswordSchema) });

  const requestCode = first.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await api<{ devCode?: string }>("/auth/password/forgot", {
        method: "POST",
        body: values,
      });
      setDevCode(res.devCode ?? null);
      setIdentifier(values.identifier);
      second.reset({ identifier: values.identifier, code: "", password: "" });
    } catch (err) {
      setFormError(applyServerErrors(err, first.setError, ["identifier"]));
    }
  });

  const reset = second.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api("/auth/password/reset", { method: "POST", body: values });
      router.replace("/login?reset=1");
    } catch (err) {
      setFormError(applyServerErrors(err, second.setError, ["code", "password"]));
    }
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight">Reset your password</h1>
        <p className="text-muted-foreground">
          {identifier
            ? "Enter the 6-digit code we sent and choose a new password."
            : "Enter the email or phone number on your account and we will send a 6-digit code."}
        </p>
      </div>
      {formError && <Alert tone="danger">{formError}</Alert>}

      {!identifier ? (
        <form onSubmit={requestCode} noValidate className="space-y-4">
          <Field
            label="Email or phone number"
            htmlFor="identifier"
            error={first.formState.errors.identifier?.message}
          >
            <Input
              id="identifier"
              autoComplete="username"
              autoCapitalize="none"
              invalid={!!first.formState.errors.identifier}
              {...first.register("identifier")}
            />
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={first.formState.isSubmitting}
          >
            {first.formState.isSubmitting && <Spinner className="size-4" />} Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={reset} noValidate className="space-y-4">
          <Alert tone="info">
            If an account exists for <strong>{identifier}</strong>, a code is on its way. It expires
            in a few minutes.
          </Alert>
          {devCode && (
            <Alert tone="warning" title="Development mode">
              No real message was sent. Your code is{" "}
              <strong className="font-label tracking-widest">{devCode}</strong>.
            </Alert>
          )}
          <input type="hidden" {...second.register("identifier")} />
          <Field label="6-digit code" htmlFor="code" error={second.formState.errors.code?.message}>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="font-label text-xl tracking-[0.5em]"
              invalid={!!second.formState.errors.code}
              {...second.register("code")}
            />
          </Field>
          <Field
            label="New password"
            htmlFor="password"
            error={second.formState.errors.password?.message}
            hint="At least 8 characters, with a letter and a number."
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              invalid={!!second.formState.errors.password}
              {...second.register("password")}
            />
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={second.formState.isSubmitting}
          >
            {second.formState.isSubmitting && <Spinner className="size-4" />} Change password
          </Button>
          <button
            type="button"
            onClick={() => setIdentifier(null)}
            className="mx-auto block text-sm font-semibold text-primary hover:underline"
          >
            Use a different email or phone
          </button>
        </form>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
