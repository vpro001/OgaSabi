import { Shell } from "@/components/site/shell";
import { ArtisanHome } from "./artisan-home";

export const metadata = {
  title: "For artisans",
  description: "Get found by customers near you and build a trust score from your good work.",
};

export default function ArtisanPage() {
  return (
    <Shell>
      <ArtisanHome />
    </Shell>
  );
}
