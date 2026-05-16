import Link from "next/link";

import { AnimalImage } from "@/components/animals/animal-image";
import { Badge } from "@/components/ui/badge";
import type { AnimalSummaryView } from "@/lib/api/animals";

type AnimalCardProps = {
  animal: AnimalSummaryView;
  enterIndex?: number;
  canEdit?: boolean;
};

function statusToBadgeVariant(
  status: string,
): "available" | "pending" | "muted" {
  switch (status) {
    case "AVAILABLE":
      return "available";
    case "PENDING":
      return "pending";
    case "ADOPTED":
    case "WITHDRAWN":
    case "NOT_AVAILABLE":
      return "muted";
    default:
      return "muted";
  }
}

export function AnimalCard({
  animal,
  enterIndex,
  canEdit,
}: AnimalCardProps) {
  const staggerClass =
    enterIndex !== undefined ? `delay-${(enterIndex % 6) + 1}` : "";

  return (
    <article
      className={[
        "group rounded-3xl bg-white shadow-[var(--shadow-card)] overflow-hidden flex flex-col border border-[var(--color-border)]",
        "transition-all duration-300",
        "hover:-translate-y-2 hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--color-accent)]/40",
        "animate-fade-up",
        staggerClass,
      ].filter(Boolean).join(" ")}
    >
      {/* Image */}
      <Link
        href={`/animals/${animal.id}`}
        className="relative block overflow-hidden aspect-[4/3]"
      >
        <AnimalImage
          imageUrl={animal.imageUrl}
          name={animal.name}
          animalType={animal.animalType}
          variant="card"
        />
        {/* Hover overlay — warm tint */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-primary)]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        {/* Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant={statusToBadgeVariant(animal.status)}>
            {animal.statusLabel}
          </Badge>
        </div>
      </Link>

      {/* Body */}
      <div className="p-6 flex flex-col gap-3 flex-1">
        <Link href={`/animals/${animal.id}`} className="block group/link">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)] tracking-tight leading-tight group-hover/link:text-[var(--color-primary)] transition-colors duration-200">
            {animal.name}
          </h2>
        </Link>
        <p className="text-sm text-[var(--color-ink-soft)] font-medium">
          {animal.breed} · {animal.animalType}
        </p>
        <div className="flex gap-3 mt-auto pt-2">
          <Link
            href={`/animals/${animal.id}`}
            className="inline-flex items-center rounded-2xl border-2 border-[var(--color-accent)]/40 bg-[var(--color-accent-pale)] px-4 py-2 text-sm font-bold text-[var(--color-accent-deep)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)] active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2"
          >
            View profile
          </Link>
          {canEdit && (
            <Link
              href={`/dashboard/animals/${animal.id}/edit`}
              className="inline-flex items-center rounded-2xl border-2 border-[var(--color-primary)]/40 bg-[var(--color-primary-pale)] px-4 py-2 text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
