import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AnimalImage } from "@/components/animals/animal-image";
import { fetchAnimalForView } from "@/lib/api/animals";
import { getCurrentSession } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ id: string }>;
};

type AnimalDetailResult =
  | { kind: "success"; animal: Awaited<ReturnType<typeof fetchAnimalForView>> }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export const dynamic = "force-dynamic";

async function loadAnimal(id: string): Promise<AnimalDetailResult> {
  try {
    const animal = await fetchAnimalForView(id);

    return { kind: "success", animal };
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return { kind: "not-found" };
    }

    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "The animal profile is temporarily unavailable.",
    };
  }
}

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

function DetailPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-4">
      <p className="ci-label mb-3">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="ci-body-sm" style={{ color: "var(--color-ink-faint)" }}>{label}</span>
      <span className="ci-body-sm" style={{ color: "var(--color-ink)" }}>{value}</span>
    </div>
  );
}

export default async function AnimalDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [result, session] = await Promise.all([loadAnimal(id), getCurrentSession()]);

  if (result.kind === "not-found") {
    notFound();
  }

  if (result.kind === "error") {
    return (
      <div className="max-w-[var(--max-width-content)] mx-auto px-6 py-8">
        <div className="ci-card p-6 text-center">
          <p className="ci-label mb-2">Profile error</p>
          <h1 className="ci-h1 mb-3">Animal profile unavailable.</h1>
          <p className="ci-body mb-4">{result.message}</p>
          <Link href="/animals" className="ci-btn ci-btn--primary">Back to animals</Link>
        </div>
      </div>
    );
  }

  const { animal } = result;
  const canEditAnimal = session?.role === "STAFF" || session?.role === "ADMIN";
  const editorSlot = canEditAnimal
    ? await renderEditorSlot(
        animal,
        session.role === "ADMIN" ? "ADMIN" : "STAFF",
      )
    : undefined;

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto px-6 pt-8 pb-8">
      <Link href="/animals" className="ci-btn ci-btn--ghost-sm inline-flex mb-5">
        Back to animals
      </Link>

      <div className="grid gap-7 mb-7 items-start" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-xl">
          <AnimalImage
            imageUrl={animal.imageUrl}
            name={animal.name}
            animalType={animal.animalType}
            variant="detail"
          />
        </div>

        <div>
          <span className={`ci-badge ci-badge--${statusToBadge(animal.status)} inline-flex mb-3`}>
            {animal.statusLabel}
          </span>
          <h1 className="ci-h1 mb-3">{animal.name}</h1>
          <p className="ci-body-lg">{animal.breed} · {animal.animalType}{animal.age ? ` · ${animal.age} years old` : ""}</p>

          {animal.temperament && (
            <p className="mt-4 italic" style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: "var(--color-ink-soft)" }}>
              &ldquo;{animal.temperament}&rdquo;
            </p>
          )}

          <div className="mt-6 flex gap-3 flex-wrap">
            <button className="ci-btn ci-btn--accent ci-btn--lg">I&apos;m interested in {animal.name}</button>
            <button className="ci-btn ci-btn--ghost ci-btn--lg">Save for later</button>
          </div>
        </div>
      </div>

      <div className="max-w-[65ch] mb-7">
        <h2 className="ci-h3 mb-3">About {animal.name}</h2>
        <p className="ci-body-lg">
          {animal.description?.trim() || `A biography has not been published for ${animal.name} yet. Contact us to learn more.`}
        </p>
      </div>

      <div className="grid gap-5 mb-7" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))" }}>
        <DetailPanel title="Details">
          <DetailItem label="Breed" value={animal.breed} />
          <DetailItem label="Type" value={animal.animalType} />
          {animal.age && <DetailItem label="Age" value={`${animal.age} years`} />}
          {animal.sex && <DetailItem label="Sex" value={animal.sex} />}
          <DetailItem label="Status" value={animal.statusLabel} />
        </DetailPanel>
        {animal.temperament && (
          <DetailPanel title="Temperament">
            <p className="ci-body">{animal.temperament}</p>
          </DetailPanel>
        )}
      </div>

      {editorSlot}
    </div>
  );
}

async function renderEditorSlot(
  animal: Awaited<ReturnType<typeof fetchAnimalForView>>,
  userRole: "STAFF" | "ADMIN",
): Promise<ReactNode> {
  const { AnimalEditorSlot } = await import(
    "@/components/animals/animal-editor-slot"
  );

  return <AnimalEditorSlot animal={animal} userRole={userRole} />;
}
