import Link from "next/link";

import { AnimalImage } from "@/components/animals/animal-image";
import type { AnimalSummaryView } from "@/lib/api/animals";

type AnimalCardProps = {
  animal: AnimalSummaryView;
};

export function AnimalCard({ animal }: AnimalCardProps) {
  return (
    <article className="route-card animal-card">
      <div className="animal-card-media">
        <AnimalImage
          imageUrl={animal.imageUrl}
          name={animal.name}
          animalType={animal.animalType}
          variant="card"
        />
      </div>

      <span className="status-badge">{animal.statusLabel}</span>
      <h2 className="route-card-title">{animal.name}</h2>
      <p className="route-card-copy">
        {animal.breed} · {animal.animalType}
      </p>
      <div className="route-actions">
        <Link href={`/animals/${animal.id}`} className="link-chip">
          View profile
        </Link>
      </div>
    </article>
  );
}
