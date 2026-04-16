import Link from "next/link";

import { AnimalImage } from "@/components/animals/animal-image";
import type { AnimalSummaryView } from "@/lib/api/animals";

type AnimalCardProps = {
  animal: AnimalSummaryView;
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

export function AnimalCard({ animal }: AnimalCardProps) {
  return (
    <article className="ci-card">
      <div className="ci-card__media">
        <AnimalImage
          imageUrl={animal.imageUrl}
          name={animal.name}
          animalType={animal.animalType}
          variant="card"
        />
        <div className="ci-card__badge">
          <span className={`ci-badge ci-badge--${statusToBadge(animal.status)}`}>{animal.statusLabel}</span>
        </div>
      </div>
      <div className="ci-card__body">
        <h2 className="ci-card__name">{animal.name}</h2>
        <p className="ci-card__meta">{animal.breed} · {animal.animalType}</p>
        <div className="ci-card__actions">
          <Link href={`/animals/${animal.id}`} className="ci-btn ci-btn--ghost-sm">
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}