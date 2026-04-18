import Link from "next/link";
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-4">
      <Eyebrow className="mb-3">{title}</Eyebrow>
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
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-[var(--color-ink-faint)]">{label}</span>
      <span className="text-[var(--color-ink)] font-medium">{value}</span>
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
      <div className="max-w-[var(--max-width-content)] mx-auto px-6 py-8">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 text-center">
          <Eyebrow className="mb-3">Profile error</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium text-[var(--color-ink)] mb-4 tracking-[-0.02em] leading-[1.05]">
            Animal profile unavailable.
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mb-5">{result.message}</p>
          <Button as="a" href="/animals" variant="primary">
            Back to animals
          </Button>
        </div>
      </div>
    );
  }

  const { animal } = result;
  const canEditAnimal = session?.role === "STAFF" || session?.role === "ADMIN";
  const isRegistered = profile?.interests.some((i) => i.animalId === animal.id) ?? false;
  const editorSlot = canEditAnimal
    ? await renderEditorSlot(animal, session.role === "ADMIN" ? "ADMIN" : "STAFF")
    : undefined;

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto px-6 pt-8 pb-8">
      <Link
        href="/animals"
        className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] transition-all duration-200 mb-5"
      >
        Back to animals
      </Link>

      <div
        className="grid gap-7 mb-7 items-start"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-xl">
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
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium text-[var(--color-ink)] mb-3 tracking-[-0.02em] leading-[1.05]">
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
            <RegisterInterestButton animalId={animal.id} animalName={animal.name} isRegistered={isRegistered} />
          </div>
        </div>
      </div>

      <div className="max-w-[65ch] mb-7">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-3 tracking-[-0.02em] leading-[1.2]">
          About {animal.name}
        </h2>
        <p className="text-base text-[var(--color-ink-soft)] leading-relaxed">
          {animal.description?.trim() ||
            `A biography has not been published for ${animal.name} yet. Contact us to learn more.`}
        </p>
      </div>

      <div
        className="grid gap-5 mb-7"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))" }}
      >
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
