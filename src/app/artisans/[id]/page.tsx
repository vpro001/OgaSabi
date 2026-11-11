import { type Metadata } from "next";
import { Shell } from "@/components/site/shell";
import { db } from "@/server/db/client";
import { uuidParam } from "@/server/http/handler";
import { ProfileView } from "./profile-view";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return { title: "Artisan not found" };
  const a = await db.artisanProfile
    .findFirst({
      where: { id, status: "ACTIVE", deletedAt: null },
      select: {
        businessName: true,
        areaLabel: true,
        bio: true,
        categories: {
          where: { isPrimary: true },
          select: { category: { select: { name: true } } },
        },
      },
    })
    .catch(() => null);
  if (!a) return { title: "Artisan not found" };
  const trade = a.categories[0]?.category.name ?? "Artisan";
  return {
    title: `${a.businessName} · ${trade}${a.areaLabel ? ` in ${a.areaLabel}` : ""}`,
    description:
      a.bio?.slice(0, 155) ??
      `${trade} on OgaSabi. See the trust score, verified reviews and callout fee.`,
  };
}

export default async function ArtisanPage({ params }: Props) {
  const { id } = await params;
  return (
    <Shell width="wide">
      <ProfileView id={id} />
    </Shell>
  );
}
