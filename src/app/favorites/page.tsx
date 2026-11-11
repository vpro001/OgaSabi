import { Shell, PageHeader } from "@/components/site/shell";
import { Favorites } from "./favorites";

export const metadata = { title: "Saved artisans" };

export default function FavoritesPage() {
  return (
    <Shell width="wide">
      <PageHeader
        title="Saved artisans"
        description="People you trust, one tap away the next time something breaks."
      />
      <Favorites />
    </Shell>
  );
}
