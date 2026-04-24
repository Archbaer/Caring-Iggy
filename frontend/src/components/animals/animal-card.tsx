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
        "group rounded-2xl border border-[var(--color-border)]",
        "bg-[var(--color-surface)] shadow-[var(--shadow-card)]",
        "overflow-hidden flex flex-col",
        "transition-shadow duration-300",
        "hover:-translate-y-1.5 hover:shadow-[var(--shadow-card-hover)]",
        "hover:border-[var(--color-accent)]/60",
        "hover:border-l-2 hover:border-l-[var(--color-accent)]",
        "animate-fade-up",
        staggerClass,
      ]
        .filter(Boolean)
        .join(" ")}
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
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] tracking-[-0.02em] leading-[1.2] group-hover/link:text-[var(--color-primary)] transition-colors duration-200">
            {animal.name}
          </h2>
        </Link>
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
          {animal.breed} · {animal.animalType}
        </p>
        <div className="flex gap-3 mt-1">
          <Link
            href={`/animals/${animal.id}`}
            className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] hover:text-[var(--color-accent)] active:scale-95 transition-all duration-200"
          >
            View profile
          </Link>
          {canEdit && (
            <Link
              href={`/animals/${animal.id}/edit`}
              className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)] transition-all duration-200"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
