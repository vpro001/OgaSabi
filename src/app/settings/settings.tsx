"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera } from "lucide-react";
import { type z } from "zod";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, Avatar, Card, PageLoading, Spinner } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ME_KEY, useRequireAuth } from "@/hooks/use-auth";
import { api, errorMessage, uploadFile } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { humanize } from "@/lib/format";
import { changePasswordSchema } from "@/lib/schemas";
import { type Me } from "@/lib/types";

type Pref = { type: string; sms: boolean; email: boolean };

export function Settings() {
  const me = useRequireAuth();
  if (!me) return <PageLoading />;
  return (
    <div className="space-y-6">
      <ProfileCard me={me} />
      <PasswordCard />
      <PreferencesCard />
      <DangerCard isAdmin={me.roles.includes("ADMIN")} />
    </div>
  );
}

function ProfileCard({ me }: { me: Me }) {
  const toast = useToast();
  const client = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [verify, setVerify] = useState<"SMS" | "EMAIL" | null>(null);
  const { register, handleSubmit, setError, formState } = useForm({
    defaultValues: {
      firstName: me.firstName,
      lastName: me.lastName,
      email: me.email ?? "",
      phone: me.phone ?? "",
    },
  });
  const save = handleSubmit(async (values) => {
    setFormError(null);
    try {
      client.setQueryData(ME_KEY, await api<Me>("/auth/me", { method: "PATCH", body: values }));
      toast.success("Your details were saved.");
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ["firstName", "lastName", "email", "phone"]));
    }
  });
  const avatar = useMutation({
    mutationFn: async (file: File) => {
      const { key } = await uploadFile(file, "avatar");
      return api<Me>("/auth/me", { method: "PATCH", body: { avatarKey: key } });
    },
    onSuccess: (data) => {
      client.setQueryData(ME_KEY, data);
      toast.success("Photo updated.");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const e = formState.errors;

  return (
    <Card>
      <h2 className="text-lg font-extrabold">Your details</h2>
      <div className="mt-4 flex items-center gap-4">
        <Avatar
          name={`${me.firstName} ${me.lastName}`}
          src={me.avatarUrl}
          className="size-16 text-lg"
        />
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted">
          {avatar.isPending ? (
            <Spinner className="size-4" />
          ) : (
            <Camera className="size-4" aria-hidden />
          )}{" "}
          Change photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={avatar.isPending}
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              ev.target.value = "";
              if (f) avatar.mutate(f);
            }}
          />
        </label>
      </div>
      {formError && (
        <Alert tone="danger" className="mt-4">
          {formError}
        </Alert>
      )}
      <form onSubmit={save} noValidate className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="s-first" error={e.firstName?.message}>
            <Input
              id="s-first"
              autoComplete="given-name"
              {...register("firstName", { required: "First name is required" })}
            />
          </Field>
          <Field label="Last name" htmlFor="s-last" error={e.lastName?.message}>
            <Input
              id="s-last"
              autoComplete="family-name"
              {...register("lastName", { required: "Last name is required" })}
            />
          </Field>
        </div>
        <Field label="Phone number" htmlFor="s-phone" error={e.phone?.message}>
          <Input id="s-phone" type="tel" autoComplete="tel" {...register("phone")} />
        </Field>
        <VerifyLine
          verified={me.phoneVerified}
          present={!!me.phone}
          onVerify={() => setVerify("SMS")}
          what="phone number"
        />
        <Field label="Email address" htmlFor="s-email" error={e.email?.message}>
          <Input
            id="s-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            {...register("email")}
          />
        </Field>
        <VerifyLine
          verified={me.emailVerified}
          present={!!me.email}
          onVerify={() => setVerify("EMAIL")}
          what="email address"
        />
        <Button type="submit" disabled={formState.isSubmitting || !formState.isDirty}>
          {formState.isSubmitting && <Spinner className="size-4" />} Save changes
        </Button>
      </form>
      <VerifyDialog channel={verify} onClose={() => setVerify(null)} />
    </Card>
  );
}

function VerifyLine({
  verified,
  present,
  onVerify,
  what,
}: {
  verified: boolean;
  present: boolean;
  onVerify: () => void;
  what: string;
}) {
  if (!present) return null;
  return verified ? (
    <p className="-mt-2 flex items-center gap-1.5 text-sm font-medium text-success">
      <BadgeCheck className="size-4" aria-hidden /> Verified
    </p>
  ) : (
    <p className="-mt-2 text-sm text-muted-foreground">
      Not verified yet.{" "}
      <button
        type="button"
        onClick={onVerify}
        className="font-semibold text-primary underline underline-offset-2"
      >
        Verify this {what}
      </button>
    </p>
  );
}

function VerifyDialog({
  channel,
  onClose,
}: {
  channel: "SMS" | "EMAIL" | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const [code, setCode] = useState("");
  const send = useMutation({
    mutationFn: () =>
      api<{ devCode?: string }>("/auth/otp/send", { method: "POST", body: { channel } }),
  });
  const check = useMutation({
    mutationFn: () => api<Me>("/auth/otp/verify", { method: "POST", body: { channel, code } }),
    onSuccess: (data) => {
      client.setQueryData(ME_KEY, data);
      toast.success("Verified. Thank you.");
      setCode("");
      send.reset();
      onClose();
    },
  });
  return (
    <Dialog
      open={!!channel}
      onClose={onClose}
      title={channel === "SMS" ? "Verify your phone number" : "Verify your email address"}
      description="We send a 6-digit code to confirm it is really yours."
    >
      <div className="space-y-4">
        {!send.isSuccess ? (
          <Button className="w-full" disabled={send.isPending} onClick={() => send.mutate()}>
            {send.isPending && <Spinner className="size-4" />} Send me a code
          </Button>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              check.mutate();
            }}
          >
            {send.data.devCode && (
              <Alert tone="warning" title="Development mode">
                No real message was sent. Your code is{" "}
                <strong className="font-label tracking-widest">{send.data.devCode}</strong>.
              </Alert>
            )}
            <Field label="6-digit code" htmlFor="verify-code">
              <Input
                id="verify-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="font-label text-xl tracking-[0.5em]"
              />
            </Field>
            {check.isError && <Alert tone="danger">{errorMessage(check.error)}</Alert>}
            <Button
              type="submit"
              className="w-full"
              disabled={code.length !== 6 || check.isPending}
            >
              {check.isPending && <Spinner className="size-4" />} Verify
            </Button>
          </form>
        )}
        {send.isError && <Alert tone="danger">{errorMessage(send.error)}</Alert>}
      </div>
    </Dialog>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, formState } = useForm<
    z.infer<typeof changePasswordSchema>
  >({ resolver: zodResolver(changePasswordSchema) });
  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api("/auth/password/change", { method: "POST", body: values });
      reset();
      toast.success("Password changed. Other devices were signed out.");
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ["currentPassword", "newPassword"]));
    }
  });
  return (
    <Card>
      <h2 className="text-lg font-extrabold">Password</h2>
      {formError && (
        <Alert tone="danger" className="mt-4">
          {formError}
        </Alert>
      )}
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <Field
          label="Current password"
          htmlFor="p-current"
          error={formState.errors.currentPassword?.message}
        >
          <PasswordInput
            id="p-current"
            autoComplete="current-password"
            invalid={!!formState.errors.currentPassword}
            {...register("currentPassword")}
          />
        </Field>
        <Field
          label="New password"
          htmlFor="p-new"
          error={formState.errors.newPassword?.message}
          hint="At least 8 characters, with a letter and a number."
        >
          <PasswordInput
            id="p-new"
            autoComplete="new-password"
            invalid={!!formState.errors.newPassword}
            {...register("newPassword")}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Spinner className="size-4" />} Change password
        </Button>
      </form>
    </Card>
  );
}

function PreferencesCard() {
  const toast = useToast();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => api<Pref[]>("/notifications/preferences"),
  });
  const save = useMutation({
    mutationFn: (preferences: Pref[]) =>
      api("/notifications/preferences", { method: "PUT", body: { preferences } }),
    onMutate: (preferences) => client.setQueryData(["notification-preferences"], preferences),
    onError: (err) => {
      toast.error(errorMessage(err));
      client.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
  const toggle = (type: string, channel: "sms" | "email") => {
    if (!query.data) return;
    save.mutate(query.data.map((p) => (p.type === type ? { ...p, [channel]: !p[channel] } : p)));
  };
  return (
    <Card>
      <h2 className="text-lg font-extrabold">Notifications</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You always get notifications inside OgaSabi. Choose which ones should also reach you by SMS
        or email.
      </p>
      {query.isPending ? (
        <Spinner className="mt-4" />
      ) : query.isError ? (
        <Alert tone="danger" className="mt-4">
          {errorMessage(query.error)}
        </Alert>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left font-label text-xs tracking-wide text-muted-foreground uppercase">
              <th scope="col" className="pb-2 font-bold">
                Event
              </th>
              <th scope="col" className="w-16 pb-2 text-center font-bold">
                SMS
              </th>
              <th scope="col" className="w-16 pb-2 text-center font-bold">
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((p) => (
              <tr key={p.type} className="border-t">
                <th scope="row" className="py-2.5 text-left font-medium">
                  {humanize(p.type)}
                </th>
                {(["sms", "email"] as const).map((c) => (
                  <td key={c} className="text-center">
                    <input
                      type="checkbox"
                      className="size-5 accent-(--primary)"
                      checked={p[c]}
                      onChange={() => toggle(p.type, c)}
                      aria-label={`${humanize(p.type)} by ${c === "sms" ? "SMS" : "email"}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function DangerCard({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const remove = useMutation({
    mutationFn: () => api("/auth/me", { method: "DELETE", body: { password } }),
    onSuccess: () => {
      client.clear();
      client.setQueryData(ME_KEY, null);
      router.replace("/");
    },
  });
  if (isAdmin) return null;
  return (
    <Card className="border-destructive/30">
      <h2 className="text-lg font-extrabold">Delete account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your name, phone number and email are erased. Reviews you wrote and your job history stay,
        without your name, so trust scores remain accurate.
      </p>
      <Button variant="outline" className="mt-4 text-destructive" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        description="This cannot be undone."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            remove.mutate();
          }}
        >
          <Field label="Enter your password to confirm" htmlFor="del-password">
            <PasswordInput
              id="del-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {remove.isError && <Alert tone="danger">{errorMessage(remove.error)}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep my account
            </Button>
            <Button type="submit" variant="destructive" disabled={!password || remove.isPending}>
              {remove.isPending && <Spinner className="size-4" />} Delete account
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
