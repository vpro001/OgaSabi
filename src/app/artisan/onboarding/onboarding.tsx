"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/artisan/profile-form";
import { ErrorState, PageLoading } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useRequireAuth } from "@/hooks/use-auth";
import { useOwnArtisan } from "@/hooks/use-own-artisan";
import { errorMessage } from "@/lib/api";

export function Onboarding() {
  const me = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const profile = useOwnArtisan(!!me);
  const exists = !!profile.data;

  useEffect(() => {
    if (exists) router.replace("/artisan/profile");
  }, [exists, router]);

  if (!me || profile.isPending || exists) return <PageLoading />;
  if (profile.isError)
    return <ErrorState message={errorMessage(profile.error)} onRetry={() => profile.refetch()} />;
  return (
    <ProfileForm
      initial={null}
      submitLabel="Publish my profile"
      onSaved={() => {
        toast.success("Your profile is live. Next: verify your identity.");
        router.replace("/artisan/verification?welcome=1");
      }}
    />
  );
}
