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
    <div className="ci-card" style={{ padding: "var(--space-4)" }}>
      <p className="ci-label" style={{ marginBottom: "var(--space-3)" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>{children}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)" }}>
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
      <div style={{ maxWidth: "var(--max-width-content)", margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}>
        <div className="ci-card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
          <p className="ci-label" style={{ marginBottom: "var(--space-2)" }}>Profile error</p>
          <h1 className="ci-h1" style={{ marginBottom: "var(--space-3)" }}>Animal profile unavailable.</h1>
          <p className="ci-body" style={{ marginBottom: "var(--space-4)" }}>{result.message}</p>
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
    <div style={{ maxWidth: "var(--max-width-content)", margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}>
      <Link href="/animals" className="ci-btn ci-btn--ghost-sm" style={{ marginBottom: "var(--space-5)", display: "inline-flex" }}>
        Back to animals
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-7)", marginBottom: "var(--space-7)", alignItems: "start" }}>
        <div className="ci-card" style={{ overflow: "hidden" }}>
          <div style={{ aspectRatio: "4/5" }}>
            <AnimalImage
              imageUrl={animal.imageUrl}
              name={animal.name}
              animalType={animal.animalType}
              variant="detail"
            />
          </div>
        </div>

        <div>
          <span className={`ci-badge ci-badge--${statusToBadge(animal.status)}`} style={{ marginBottom: "var(--space-3)", display: "inline-flex" }}>
            {animal.statusLabel}
          </span>
          <h1 className="ci-h1" style={{ marginBottom: "var(--space-3)" }}>{animal.name}</h1>
          <p className="ci-body-lg">{animal.breed} · {animal.animalType}{animal.age ? ` · ${animal.age} years old` : ""}</p>

          {animal.temperament && (
            <p style={{ marginTop: "var(--space-4)", fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: "var(--color-ink-soft)", fontStyle: "italic" }}>
              &ldquo;{animal.temperament}&rdquo;
            </p>
          )}

          <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <button className="ci-btn ci-btn--accent ci-btn--lg">I&apos;m interested in {animal.name}</button>
            <button className="ci-btn ci-btn--ghost ci-btn--lg">Save for later</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "65ch", marginBottom: "var(--space-7)" }}>
        <h2 className="ci-h3" style={{ marginBottom: "var(--space-3)" }}>About {animal.name}</h2>
        <p className="ci-body-lg">
          {animal.description?.trim() || `A biography has not been published for ${animal.name} yet. Contact us to learn more.`}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "var(--space-5)", marginBottom: "var(--space-7)" }}>
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
