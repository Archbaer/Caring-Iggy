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
import Link from "next/link";

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
): "available" | "pending" | "adopted" | "muted" {
  switch (status) {
    case "AVAILABLE": return "available";
    case "PENDING": return "pending";
    case "ADOPTED": return "adopted";
    case "WITHDRAWN":
    case "NOT_AVAILABLE": return "muted";
    default: return "muted";
  }
}

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-[var(--color-border)] shadow-sm p-4">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-faint)] mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 mb-1.5 last:mb-0">
      <span className="text-xs text-[var(--color-ink-faint)]">{label}</span>
      <span className="text-xs font-semibold text-[var(--color-ink)]">{value}</span>
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

  if (result.kind === "not-found") notFound();

  if (result.kind === "error") {
    return (
      <div className="max-w-[86rem] mx-auto px-6 py-8">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 text-center">
          <Eyebrow className="mb-3">Profile error</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium text-[var(--color-ink)] mb-4">
            Animal profile unavailable.
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mb-5">{result.message}</p>
          <Button asChild variant="default">
            <Link href="/animals">Back to animals</Link>
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

  const ageLabel = animal.age ? `${animal.age} year${animal.age === 1 ? "" : "s"} old` : null;
  const sexLabel = animal.sex
    ? animal.sex.charAt(0) + animal.sex.slice(1).toLowerCase()
    : null;
  const sizeLabel = animal.size
    ? animal.size.charAt(0) + animal.size.slice(1).toLowerCase()
    : null;

  return (
    <div className="max-w-[86rem] mx-auto px-6 pt-8 pb-12">
      <Link
        href="/animals"
        className="inline-flex items-center gap-1 text-[var(--color-accent)] font-semibold text-sm hover:underline mb-6"
      >
        ← Back to animals
      </Link>

      {/* Hero: fixed image left + detail cards right */}
      <div className="flex flex-col sm:grid sm:gap-7 sm:items-start mb-8"
        style={{ gridTemplateColumns: "480px 1fr" }}
      >
        {/* Image — fixed frame */}
        <div className="w-full aspect-[4/3] sm:w-[480px] sm:h-[380px] sm:aspect-auto overflow-hidden rounded-3xl border border-[var(--color-border)] shadow-xl mb-6 sm:mb-0 flex-shrink-0">
          <AnimalImage
            imageUrl={animal.imageUrl}
            name={animal.name}
            animalType={animal.animalType}
            variant="detail"
          />
        </div>

        {/* Right column: header + stacked cards */}
        <div className="flex flex-col gap-3">
          <div>
            <Badge variant={statusToBadgeVariant(animal.status)} className="mb-2">
              {animal.statusLabel}
            </Badge>
            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-ink)] tracking-tight mb-1">
              {animal.name}
            </h1>
            <p className="text-sm text-[var(--color-ink-soft)]">
              {animal.breed} · {animal.animalType}
              {ageLabel ? ` · ${ageLabel}` : ""}
            </p>
          </div>

          {/* Details card */}
          <DetailCard title="Details">
            <DetailRow label="Breed" value={animal.breed} />
            <DetailRow label="Type" value={animal.animalType} />
            <DetailRow label="Age" value={ageLabel} />
            <DetailRow label="Sex" value={sexLabel} />
            <DetailRow label="Size" value={sizeLabel} />
            <DetailRow label="Status" value={animal.statusLabel} />
            <DetailRow label="Intake date" value={animal.intakeDate} />
          </DetailCard>

          {/* Temperament card — only if present */}
          {animal.temperament && (
            <DetailCard title="Temperament">
              <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed italic">
                &ldquo;{animal.temperament}&rdquo;
              </p>
            </DetailCard>
          )}

          {/* About card */}
          <DetailCard title="About">
            <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
              {animal.description?.trim() ||
                `A biography has not been published for ${animal.name} yet.`}
            </p>
          </DetailCard>
        </div>
      </div>

      {/* Previous owner — only if present */}
      {animal.previousOwner && (
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-faint)] mb-3">
            Previous owner
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DetailCard title="Name">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {animal.previousOwner.name}
              </p>
            </DetailCard>
            <DetailCard title="Telephone">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {animal.previousOwner.telephone}
              </p>
            </DetailCard>
            {animal.previousOwner.email && (
              <DetailCard title="Email">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {animal.previousOwner.email}
                </p>
              </DetailCard>
            )}
            {animal.previousOwner.address && (
              <DetailCard title="Address">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {animal.previousOwner.address}
                </p>
              </DetailCard>
            )}
          </div>
        </div>
      )}

      {/* Editor slot (staff/admin only) */}
      {editorSlot}

      {/* CTA — centered at bottom */}
      <div className="flex justify-center pt-4">
        <RegisterInterestButton
          animalId={animal.id}
          animalName={animal.name}
          isRegistered={isRegistered}
          isAtCapacity={isAtCapacity}
        />
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
