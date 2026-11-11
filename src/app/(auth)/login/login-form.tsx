"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { ME_KEY } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { applyServerErrors, safeNext } from "@/lib/forms";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { type Me } from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });
  const { errors, isSubmitting } = formState;
  const next = safeNext(params.get("next"), "");

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { user } = await api<{ user: Me }>("/auth/login", { method: "POST", body: values });
      client.clear();
      client.setQueryData(ME_KEY, user);
      router.replace(
        next || (user.roles.includes("ADMIN") ? "/admin" : user.artisan ? "/artisan" : "/requests"),
      );
      router.refresh();
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ["identifier", "password"]));
    }
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to manage your requests and jobs.</p>
      </div>
      {params.get("reset") === "1" && (
        <Alert tone="success">Your password was changed. Sign in with the new one.</Alert>
      )}
      {next && !formError && <Alert tone="info">Sign in to continue.</Alert>}
      {formError && <Alert tone="danger">{formError}</Alert>}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          label="Email or phone number"
          htmlFor="identifier"
          error={errors.identifier?.message}
        >
          <Input
            id="identifier"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            invalid={!!errors.identifier}
            {...register("identifier")}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            invalid={!!errors.password}
            {...register("password")}
          />
        </Field>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4" />} Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to OgaSabi?{" "}
        <Link
          href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
