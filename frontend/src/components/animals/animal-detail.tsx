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
    <div className="grid gap-6">
      <section className="grid grid-cols-[1.3fr_0.9fr] gap-6 items-start">
        <div className="grid gap-3 content-start">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Public profile</p>
          <span className="inline-flex items-center rounded-full text-xs font-bold px-3 py-1">{animal.statusLabel}</span>
          <h1 className="ci-h1">{animal.name}</h1>
          <p className="ci-body-lg">
            {animal.breed} · {animal.animalType}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-warm)]">
          <AnimalImage
            imageUrl={animal.imageUrl}
            name={animal.name}
            animalType={animal.animalType}
            variant="detail"
          />
        </div>
      </section>

      <section className="detail-grid grid gap-4">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">Overview</p>
          <h2 className="ci-h3 mb-3">Public details</h2>
          <ul className="list-none space-y-3">
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

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">About</p>
          <h2 className="ci-h3 mb-3">Profile notes</h2>
          <p className="ci-body">
            {animal.description?.trim() || "A longer public biography has not been published for this animal yet."}
          </p>
        </article>

        {editorSlot ? (
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">Staff tools</p>
            <h2 className="ci-h3 mb-3">Animal editor shell</h2>
            <p className="ci-body mb-3">
              These controls are loaded only for authorized staff accounts, but all mutations still pass through protected server-side authorization.
            </p>
            {editorSlot}
          </article>
        ) : null}
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">Navigation</p>
        <h2 className="ci-h3 mb-3">Continue browsing.</h2>
        <p className="ci-body mb-4">
          Return to the public catalog to explore more available profiles.
        </p>
        <Link href="/animals" className="inline-flex items-center gap-2 border border-[var(--color-border)] rounded-full px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)] transition-all duration-200">
          Back to animals
        </Link>
      </section>
    </div>
  );
}
