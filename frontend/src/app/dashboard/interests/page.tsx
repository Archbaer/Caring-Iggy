import { DashboardSectionNav } from "@/components/dashboard/dashboard-section-nav";
import { InterestsManager } from "@/components/dashboard/interests-manager";
import { ActionLink } from "@/components/ui/action-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { fetchAdopterProfile } from "@/lib/api/adopter";
import { fetchAnimalForView, fetchAnimalsForView } from "@/lib/api/animals";
import { getRequiredRoleSession } from "@/lib/auth/server-session";
import { MAX_INTERESTS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardInterestsPage() {
  const session = await getRequiredRoleSession("ADOPTER");
  const result = session.profileId
    ? await loadInterestsData(session.profileId)
    : { kind: "error" as const, message: "Your adopter profile is not linked to this account yet." };

  if (result.kind === "error") {
    return (
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8">
          <Eyebrow>Protected route</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
            Interested animals
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            We couldn&apos;t load your interested animal list.
          </p>
        </section>

        <DashboardSectionNav currentPath="/dashboard/interests" />

        <section className="flex flex-col gap-3 py-8 text-center">
          <Eyebrow>Interests error</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)]">
            Try loading your interested animals again.
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
          <ActionLink href="/dashboard/interests" variant="chip">
            Retry interests
          </ActionLink>
        </section>
      </div>
    );
  }

  const availableSavedCount = result.currentAnimals.filter(
    (animal) => animal.status === "AVAILABLE",
  ).length;

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 animate-fade-up">
        <div className="flex flex-col gap-2 mb-4">
          <Eyebrow>Protected route</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
            Interested animals
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Save up to {MAX_INTERESTS} animal profiles, review their real current adoption status, and keep your shortlist current without inventing approval or rejection states.
          </p>
        </div>

        <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-ink)]">
          {availableSavedCount} of {MAX_INTERESTS} available animals saved.
        </p>
      </section>

      <DashboardSectionNav currentPath="/dashboard/interests" />

      <InterestsManager
        currentAnimals={result.currentAnimals}
        catalogAnimals={result.catalogAnimals}
      />
    </div>
  );
}

async function loadInterestsData(profileId: string) {
  try {
    const [profile, catalogAnimals] = await Promise.all([
      fetchAdopterProfile(profileId),
      fetchAnimalsForView().catch(() => []),
    ]);
    if (!profile) {
      return {
        kind: "error" as const,
        message: "Your adopter profile is not linked to this account yet.",
      };
    }
    const currentAnimals = (
      await Promise.all(
        profile.interests.map(async (interest) => {
          try {
            return await fetchAnimalForView(interest.animalId);
          } catch {
            return null;
          }
        }),
      )
    ).filter((animal): animal is Awaited<ReturnType<typeof fetchAnimalForView>> => animal !== null);

    return {
      kind: "success" as const,
      currentAnimals,
      catalogAnimals,
    };
  } catch (error) {
    return {
      kind: "error" as const,
      message:
        error instanceof Error
          ? error.message
          : "Interested animals are temporarily unavailable.",
    };
  }
}
