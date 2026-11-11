import {
  BrickWall,
  Car,
  Cctv,
  Droplets,
  Flame,
  Fuel,
  Hammer,
  LayoutGrid,
  PaintRoller,
  PanelTop,
  Refrigerator,
  Satellite,
  Snowflake,
  Sparkles,
  SunMedium,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Categories store a lucide icon name (`categories.iconKey`); only these are bundled.
const ICONS: Record<string, LucideIcon> = {
  Zap,
  Droplets,
  Snowflake,
  Fuel,
  SunMedium,
  Car,
  Hammer,
  PaintRoller,
  LayoutGrid,
  Flame,
  BrickWall,
  PanelTop,
  Cctv,
  Satellite,
  Refrigerator,
  Sparkles,
};

export function CategoryIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const Icon = ICONS[iconKey] ?? Wrench;
  return <Icon className={className} aria-hidden />;
}
