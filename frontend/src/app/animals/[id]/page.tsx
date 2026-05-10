import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AnimalImage } from "@/components/animals/animal-image";
import { RegisterInterestButton } from "@/components/animals/register-interest-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { fetchAdopterProfile } from "@/lib/api/adopter";
import { fetchAnimalForView } from "@/lib/api/animals";
import { getCurrentSession } from "@/lib/auth/server-session";
import { MAX_INTERESTS } from "@/lib/types";

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

function statusToBadgeVariant(
  status: string,
): "available" | "pending" | "adopted" | "muted" {
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
    <div className="rounded-3xl bg-white shadow-[var(--shadow-card)] border border-[var(--color-border)] p-6">
      <h3 className="text-sm font-bold text-[var(--color-ink)] mb-3 uppercase tracking-wide">{title}</h3>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs text-[var(--color-ink-faint)]">{label}</span>
      <span className="text-sm text-[var(--color-ink)] font-semibold">{value}</span>
    </div>
  );
}

export default async function AnimalDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getCurrentSession();

  const [result, profile] = await Promise.all([
    loadAnimal(id),
    session?.profileId ? fetchAdopterProfile(session.profileId) : null,
  ]);

  if (result.kind === "not-found") {
    notFound();
  }

  if (result.kind === "error") {
    return (
      <div className="max-w-[86rem] mx-auto px-6 py-8">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 text-center">
          <Eyebrow className="mb-3">Profile error</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium text-[var(--color-ink)] mb-4 tracking-[-0.02em] leading-[1.05]">
            Animal profile unavailable.
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mb-5">{result.message}</p>
          <Button asChild variant="default">
            <a href="/animals">Back to animals</a>
          </Button>
        </div>
      </div>
    );
  }

  const { animal } = result;
  const canEditAnimal = session?.role === "STAFF" || session?.role === "ADMIN";
  const isRegistered = profile?.interests.some((i) => i.animalId === animal.id) ?? false;
  const isAtCapacity = (profile?.interests.length ?? 0) >= MAX_INTERESTS;
  const editorSlot = canEditAnimal
    ? await renderEditorSlot(animal, session.role === "ADMIN" ? "ADMIN" : "STAFF")
    : undefined;

  return (
    <div className="max-w-[86rem] mx-auto px-6 pt-8 pb-8">
      <a href="/animals" className="inline-flex items-center gap-1 text-[var(--color-accent)] font-semibold text-sm hover:underline mb-6">
        ← Back to animals
      </a>

      <div
        className="grid gap-7 mb-7 items-start"
        style={{ gridTemplateColumns: "1.1fr 0.9fr" }}
      >
        <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] shadow-xl">
          <AnimalImage
            imageUrl={animal.imageUrl}
            name={animal.name}
            animalType={animal.animalType}
            variant="detail"
          />
        </div>

        <div>
          <Badge
            variant={statusToBadgeVariant(animal.status)}
            className="mb-3"
          >
            {animal.statusLabel}
          </Badge>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-ink)] tracking-tight mb-3">
            {animal.name}
          </h1>
          <p className="text-base text-[var(--color-ink-soft)] leading-relaxed">
            {animal.breed} · {animal.animalType}
            {animal.age ? ` · ${animal.age} years old` : ""}
          </p>

          {animal.temperament && (
            <p className="mt-4 italic text-base text-[var(--color-ink-soft)] leading-relaxed">
              &ldquo;{animal.temperament}&rdquo;
            </p>
          )}

          <div className="mt-6 flex gap-3 flex-wrap">
            <RegisterInterestButton animalId={animal.id} animalName={animal.name} isRegistered={isRegistered} isAtCapacity={isAtCapacity} />
          </div>
        </div>
      </div>

      <div className="max-w-[80ch] mb-7">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)] mb-3 tracking-tight">
          About {animal.name}
        </h2>
        <p className="text-base text-[var(--color-ink-soft)] leading-relaxed">
          {animal.description?.trim() ||
            `A biography has not been published for ${animal.name} yet. Contact us to learn more.`}
        </p>
      </div>

      <div className="grid gap-5 mb-7 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <DetailPanel title="Details">
          <DetailItem label="Breed" value={animal.breed} />
          <DetailItem label="Type" value={animal.animalType} />
          {animal.age && <DetailItem label="Age" value={`${animal.age} years`} />}
          {animal.sex && <DetailItem label="Sex" value={animal.sex} />}
          <DetailItem label="Status" value={animal.statusLabel} />
        </DetailPanel>
        {animal.temperament && (
          <DetailPanel title="Temperament">
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {animal.temperament}
            </p>
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
