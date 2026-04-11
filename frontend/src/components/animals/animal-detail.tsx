import Link from "next/link";
import type { ReactNode } from "react";

import { AnimalImage } from "@/components/animals/animal-image";
import type { AnimalDetailView } from "@/lib/api/animals";

type AnimalDetailProps = {
  animal: AnimalDetailView;
  editorSlot?: ReactNode;
};

export function AnimalDetail({ animal, editorSlot }: AnimalDetailProps) {
  return (
    <div className="page-shell">
      <section className="page-hero animal-detail-hero">
        <div className="animal-detail-copy">
          <p className="eyebrow">Public profile</p>
          <span className="status-badge">{animal.statusLabel}</span>
          <h1 className="page-title">{animal.name}</h1>
          <p className="page-copy">
            {animal.breed} · {animal.animalType}
          </p>
        </div>

        <div className="animal-detail-media">
          <AnimalImage
            imageUrl={animal.imageUrl}
            name={animal.name}
            animalType={animal.animalType}
            variant="detail"
          />
        </div>
      </section>

      <section className="detail-grid animal-detail-grid">
        <article className="panel">
          <p className="eyebrow">Overview</p>
          <h2 className="panel-title">Public details</h2>
          <ul className="detail-list">
            <li>
              <strong>Status:</strong> {animal.statusLabel}
            </li>
            <li>
              <strong>Type:</strong> {animal.animalType}
            </li>
            <li>
              <strong>Breed:</strong> {animal.breed}
            </li>
            {typeof animal.age === "number" ? (
              <li>
                <strong>Age:</strong> {animal.age}
              </li>
            ) : null}
            {animal.sex ? (
              <li>
                <strong>Sex:</strong> {animal.sex}
              </li>
            ) : null}
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">About</p>
          <h2 className="panel-title">Profile notes</h2>
          <p className="panel-copy">
            {animal.description?.trim() || "A longer public biography has not been published for this animal yet."}
          </p>
        </article>

        {editorSlot ? (
          <article className="panel">
            <p className="eyebrow">Staff tools</p>
            <h2 className="panel-title">Animal editor shell</h2>
            <p className="panel-copy">
              These controls are loaded only for authorized staff accounts, but all mutations still pass through protected server-side authorization.
            </p>
            {editorSlot}
          </article>
        ) : null}
      </section>

      <section className="empty-state">
        <p className="eyebrow">Navigation</p>
        <h2 className="panel-title">Continue browsing.</h2>
        <p className="panel-copy">
          Return to the public catalog to explore more available profiles.
        </p>
        <Link href="/animals" className="link-chip">
          Back to animals
        </Link>
      </section>
    </div>
  );
}
