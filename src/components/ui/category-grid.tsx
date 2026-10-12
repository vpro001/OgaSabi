"use client";

import { cn } from "@/lib/utils";

export type Category = {
  slug: string;
  name: string;
  iconKey: string; // lucide-react icon name
};

const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Droplets: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.16-1.43-2.74.89-.25 1.79-.71 2.54-1.38C16.21 7.17 18 8.27 18 10.33 18 13.22 15.63 15.5 12.5 15.5S7 13.22 7 10.33c0-.87.38-1.67 1.01-2.22.78.73 1.75 1.25 2.67 1.55C11.56 9.96 12 10.96 12 12.05c0 2.73-2.5 4.6-4.5 4.6z" />
    </svg>
  ),
  Snowflake: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <line x1="1" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="4.22" x2="19.78" y2="19.78" />
      <line x1="19.78" y1="4.22" x2="4.22" y2="19.78" />
      <line x1="1" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="19.78" y2="4.22" />
    </svg>
  ),
  Fuel: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M15 16v-4a2 2 0 0 0-2-2h-3a2 2 0 0 0-2 2v4" />
      <path d="M11 16v-4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4" />
    </svg>
  ),
  SunMedium: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Car: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 13 10c-3 0-5.7.6-7.6 1.8C3.7 11.3 3 12.1 3 13v3c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  ),
  Hammer: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 12H9" />
      <path d="M17 12v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8" />
      <path d="M7 8V5c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v3" />
      <path d="M9 12V5" />
    </svg>
  ),
  PaintRoller: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21v-4" />
      <path d="M21 15V5a2 2 0 0 0-2-2h-4" />
      <path d="M7 7l-4 4" />
      <path d="M3 3l18 18" />
    </svg>
  ),
  LayoutGrid: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </svg>
  ),
  Flame: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  BrickWall: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v6" />
      <path d="M15 9v6" />
      <path d="M9 15v6" />
    </svg>
  ),
  PanelTop: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="7" x="3" y="3" rx="1" />
      <path d="M3 10v11" />
      <path d="M21 10v11" />
      <path d="M7 10v11" />
      <path d="M14 10v11" />
    </svg>
  ),
  Cctv: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a7 7 0 0 0-7-7" />
      <path d="M3 12a7 7 0 0 1 7-7" />
      <path d="M12 3v7" />
      <path d="M12 16v4" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Satellite: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 7 9 3 5 7l4 4" />
      <path d="M17 11 21 7 17 3" />
      <path d="M11 17 7 21 3 17" />
      <path d="M7 11 3 7 7 3" />
    </svg>
  ),
  Refrigerator: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z" />
      <path d="M5 10h14" />
      <path d="M12 4v6" />
      <path d="M12 14v2" />
    </svg>
  ),
  Sparkles: ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v2.2" />
      <path d="M16.38 5.34l1.06 1.06" />
      <path d="M19.8 12H22" />
      <path d="M21.66 18.66l1.06 1.06" />
      <path d="M12 22v-2.2" />
      <path d="M5.34 18.66l1.06-1.06" />
      <path d="M2 12H4.2" />
      <path d="M3.34 5.34l1.06-1.06" />
    </svg>
  ),
};

export function CategoryGrid({
  categories,
  selectedSlug,
  onSelect,
  maxVisible = 8,
}: {
  categories: Category[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  maxVisible?: number;
}) {
  const displayCategories = categories.slice(0, maxVisible);

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Quick search by trade">
      {displayCategories.map((cat) => {
        const Icon = iconComponents[cat.iconKey] ?? iconComponents.Zap!;
        const isSelected = selectedSlug === cat.slug;
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onSelect(cat.slug)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
            aria-pressed={isSelected}
          >
            <Icon className="size-4" aria-hidden />
            {cat.name}
          </button>
        );
      })}
      {categories.length > maxVisible && (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground"
          disabled
        >
          +{categories.length - maxVisible} more
        </button>
      )}
    </div>
  );
}
