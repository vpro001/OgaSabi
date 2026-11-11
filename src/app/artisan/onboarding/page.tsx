import { Shell, PageHeader } from "@/components/site/shell";
import { Onboarding } from "./onboarding";

export const metadata = { title: "Join as an artisan" };

export default function OnboardingPage() {
  return (
    <Shell width="narrow">
      <PageHeader
        eyebrow="For artisans"
        title="Set up your profile"
        description="It takes about five minutes. You can change anything later."
      />
      <Onboarding />
    </Shell>
  );
}
