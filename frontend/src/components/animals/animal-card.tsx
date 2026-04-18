import Link from "next/link";

import { AnimalImage } from "@/components/animals/animal-image";
import type { AnimalSummaryView } from "@/lib/api/animals";

type AnimalCardProps = {
  animal: AnimalSummaryView;
  enterIndex?: number;
  canEdit?: boolean;
};

function statusToBadge(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "available";
    case "PENDING":
      return "pending";
    case "ADOPTED":
      return "adopted";
    case "WITHDRAWN":
    case "NOT_AVAILABLE":
      return "muted";
    default:
      return "muted";
  }
}

export function AnimalCard({ animal, enterIndex, canEdit }: AnimalCardProps) {
  const staggerClass = enterIndex !== undefined ? `delay-${(enterIndex % 5) + 1}` : "";

  return (
    <article
      className={`
        group relative overflow-hidden rounded-2xl border border-[var(--color-border)]
        bg-[var(--color-surface)] shadow-sm
        transition-all duration-300 ease-out
        hover:shadow-xl hover:-translate-y-1.5 hover:border-[var(--color-accent)]
        hover:bg-[var(--color-surface-warm)]
        ci-card-spring
        ${staggerClass}
      `}
    >
      {/* Image */}
      <Link
        href={`/animals/${animal.id}`}
        className="ci-card__media relative block overflow-hidden aspect-[4/3]"
      >
        <AnimalImage
          imageUrl={animal.imageUrl}
          name={animal.name}
          animalType={animal.animalType}
          variant="card"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* Badge */}
        <div className="ci-card__badge absolute top-3 right-3">
          <span
            className={`
              ci-badge ci-badge--${statusToBadge(animal.status)}
              backdrop-blur-sm
            `}
          >
            {animal.statusLabel}
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="ci-card__body p-5">
        <Link href={`/animals/${animal.id}`} className="block group/link">
          <h2 className="ci-card__name font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-1 transition-colors duration-200 group-hover/link:text-[var(--color-primary)]">
            {animal.name}
          </h2>
        </Link>
        <p className="ci-card__meta text-sm text-[var(--color-ink-soft)] mb-4">
          {animal.breed} · {animal.animalType}
        </p>
        <div className="ci-card__actions flex gap-2">
          <Link
            href={`/animals/${animal.id}`}
            className="
              ci-btn ci-btn--ghost-sm
              border border-[var(--color-border)] bg-[var(--color-surface)]
              text-[var(--color-ink-soft)]
              hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] hover:text-[var(--color-accent)]
              active:scale-95
              transition-all duration-200
            "
          >
            View profile
          </Link>
          {canEdit && (
            <Link
              href={`/animals/${animal.id}/edit`}
              className="ci-btn ci-btn--ghost-sm"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
