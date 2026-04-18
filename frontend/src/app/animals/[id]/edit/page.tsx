import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AnimalImage } from "@/components/animals/animal-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { fetchAnimalForView } from "@/lib/api/animals";
import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type AnimalDetailResult =
  | { kind: "success"; animal: Awaited<ReturnType<typeof fetchAnimalForView>> }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

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
): "available" | "pending" | "adopted" | "muted" | "accent" {
  switch (status) {
    case "AVAILABLE":
      return "available";
    case "PENDING":
      return "pending";
    case "ADOPTED":
      return "adopted";
    case "IN_TREATMENT":
      return "accent";
    case "DECEASED":
      return "muted";
    default:
      return "muted";
  }
}

function InfoItem({
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

export default async function AnimalEditPage({ params }: PageProps) {
  const { id } = await params;

  // getRequiredRoleSession redirects if not authenticated or wrong role
  const session = await getRequiredRoleGroupSession(["STAFF", "ADMIN"]);
  const userRole = session.role === "ADMIN" ? "ADMIN" : "STAFF";
  const result = await loadAnimal(id);

  if (result.kind === "not-found") {
    notFound();
  }

  if (result.kind === "error") {
    return (
      <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-8">
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

  const editorSlot = await renderEditorSlot(animal, userRole);

  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-8">
      <Link
        href={`/animals/${id}`}
        className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] transition-all duration-200 mb-5"
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to {animal.name}
      </Link>

      <Eyebrow className="mb-6">Staff editor</Eyebrow>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-xl">
            <AnimalImage
              imageUrl={animal.imageUrl}
              name={animal.name}
              animalType={animal.animalType}
              variant="detail"
            />
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6">
            <Badge
              variant={statusToBadgeVariant(animal.status)}
              className="mb-3"
            >
              {animal.statusLabel}
            </Badge>
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-medium text-[var(--color-ink)] mb-2 tracking-[-0.02em] leading-[1.05]">
              {animal.name}
            </h1>
            <p className="text-base text-[var(--color-ink-soft)] leading-relaxed">
              {animal.breed} · {animal.animalType}
              {animal.age ? ` · ${animal.age} years old` : ""}
            </p>

            <div className="mt-6 pt-6 border-t border-[var(--color-border)] flex flex-col gap-3">
              <InfoItem label="Breed" value={animal.breed} />
              <InfoItem label="Type" value={animal.animalType} />
              {animal.age && <InfoItem label="Age" value={`${animal.age} years`} />}
              {animal.sex && <InfoItem label="Sex" value={animal.sex} />}
              {animal.size && <InfoItem label="Size" value={animal.size} />}
              {animal.intakeDate && (
                <InfoItem
                  label="Intake date"
                  value={animal.intakeDate.slice(0, 10)}
                />
              )}
              {animal.temperament && (
                <InfoItem label="Temperament" value={animal.temperament} />
              )}
            </div>
          </div>
        </div>

        <div>{editorSlot}</div>
      </div>
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
