import { Shell, PageHeader } from "@/components/site/shell";
import { EditProfile } from "./edit-profile";

export const metadata = { title: "Edit artisan profile" };

export default function ArtisanProfilePage() {
  return (
    <Shell width="narrow">
      <PageHeader
        eyebrow="Artisan"
        title="Your public profile"
        description="This is what customers see before they send you a request."
      />
      <EditProfile />
    </Shell>
  );
}
