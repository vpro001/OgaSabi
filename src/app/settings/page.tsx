import { Shell, PageHeader } from "@/components/site/shell";
import { Settings } from "./settings";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Shell width="narrow">
      <PageHeader title="Settings" description="Your details, sign-in and how we contact you." />
      <Settings />
    </Shell>
  );
}
