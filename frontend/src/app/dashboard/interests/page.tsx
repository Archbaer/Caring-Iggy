import { DashboardSectionNav } from "@/components/dashboard/dashboard-section-nav";
import { InterestsManager } from "@/components/dashboard/interests-manager";
import { ActionLink } from "@/components/ui/action-link";
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
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Protected route</p>
          <h1 className="page-title">Interested animals</h1>
          <p className="page-copy">We couldn&apos;t load your interested animal list.</p>
        </section>

        <DashboardSectionNav currentPath="/dashboard/interests" />

        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Interests error</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Try loading your interested animals again.</h2>
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
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Protected route</p>
          <h1 className="page-title">Interested animals</h1>
          <p className="page-copy">
            Save up to {MAX_INTERESTS} animal profiles, review their real current adoption status, and keep your shortlist current without inventing approval or rejection states.
          </p>
        </div>

        <p className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">{availableSavedCount} of {MAX_INTERESTS} available animals saved.</p>
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
