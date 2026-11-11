"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Hammer, UserRound } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { ME_KEY } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { applyServerErrors, safeNext } from "@/lib/forms";
import { registerSchema, type RegisterInput } from "@/lib/schemas";
import { type Me } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [asArtisan, setAsArtisan] = useState(
    params.get("as") === "artisan" || params.get("next")?.startsWith("/artisan") === true,
  );
  const { register, handleSubmit, setError, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });
  const { errors, isSubmitting } = formState;
  const next = safeNext(params.get("next"), "");

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { user } = await api<{ user: Me }>("/auth/register", { method: "POST", body: values });
      client.clear();
      client.setQueryData(ME_KEY, user);
      router.replace(asArtisan ? "/artisan/onboarding" : next || "/search");
      router.refresh();
    } catch (err) {
      setFormError(
        applyServerErrors(err, setError, ["firstName", "lastName", "email", "phone", "password"]),
      );
    }
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground">One account works for hiring and for getting hired.</p>
      </div>

      <div role="radiogroup" aria-label="What brings you here?" className="grid grid-cols-2 gap-3">
        {[
          { value: false, icon: UserRound, title: "I need an artisan", body: "Find and hire" },
          { value: true, icon: Hammer, title: "I am an artisan", body: "Get customers" },
        ].map((o) => (
          <button
            key={o.title}
            type="button"
            role="radio"
            aria-checked={asArtisan === o.value}
            onClick={() => setAsArtisan(o.value)}
            className={cn(
              "rounded-xl border-2 p-3 text-left transition-colors",
              asArtisan === o.value
                ? "border-primary bg-primary-container/40"
                : "border-border hover:border-primary/40",
            )}
          >
            <o.icon className="mb-1.5 size-5 text-secondary" aria-hidden />
            <span className="block text-sm font-bold">{o.title}</span>
            <span className="block text-xs text-muted-foreground">{o.body}</span>
          </button>
        ))}
      </div>

      {formError && <Alert tone="danger">{formError}</Alert>}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
            <Input
              id="firstName"
              autoComplete="given-name"
              invalid={!!errors.firstName}
              {...register("firstName")}
            />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
            <Input
              id="lastName"
              autoComplete="family-name"
              invalid={!!errors.lastName}
              {...register("lastName")}
            />
          </Field>
        </div>
        <Field
          label="Phone number"
          htmlFor="phone"
          error={errors.phone?.message}
          hint="For example 0803 123 4567. Shared with an artisan only after a job is accepted."
        >
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            invalid={!!errors.phone}
            {...register("phone")}
          />
        </Field>
        <Field
          label="Email address"
          htmlFor="email"
          error={errors.email?.message}
          hint="Enter a phone number, an email, or both."
        >
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            invalid={!!errors.email}
            {...register("email")}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number."
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register("password")}
          />
        </Field>
        <div className="space-y-1">
          <Checkbox
            id="acceptTerms"
            {...register("acceptTerms")}
            label={
              <>
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Terms of use
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Privacy policy
                </Link>
                .
              </>
            }
          />
          {errors.acceptTerms && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" variant="accent" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4" />}{" "}
          {asArtisan ? "Create account and set up profile" : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
