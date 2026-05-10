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
      <div className="max-w-[80rem] mx-auto bg-canvas-pattern p-6 sm:p-8">
        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)]">
          <Eyebrow>Protected route</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-2">
            Interested animals
          </h1>
          <p className="text-[var(--color-ink-soft)] mt-2">
            We couldn&apos;t load your interested animal list.
          </p>
        </section>

        <DashboardSectionNav currentPath="/dashboard/interests" />

        <section className="flex flex-col gap-3 py-8 text-center">
          <Eyebrow>Interests error</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)]">
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
    <div className="max-w-[80rem] mx-auto bg-canvas-pattern p-6 sm:p-8">
      <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] animate-fade-up">
        <div className="flex flex-col gap-2 mb-4">
          <Eyebrow>Protected route</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-2">
            Interested animals
          </h1>
          <p className="text-[var(--color-ink-soft)] mt-2">
            Save up to {MAX_INTERESTS} animal profiles, review their real current adoption status, and keep your shortlist current without inventing approval or rejection states.
          </p>
        </div>

        <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-pale)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-primary)]">
          {availableSavedCount} of {MAX_INTERESTS} available animals saved.
        </p>
      </section>

      <DashboardSectionNav currentPath="/dashboard/interests" />

      <div className="lg:grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <InterestsManager
            currentAnimals={result.currentAnimals}
            catalogAnimals={result.catalogAnimals}
          />
        </div>

        <aside className="bg-[var(--color-primary-pale)] rounded-3xl p-6 border border-[var(--color-border)] self-start sticky top-24">
          <h3 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-4">Managing Interests</h3>
          <ul className="flex flex-col gap-3 text-sm text-[var(--color-ink-soft)]">
            <li className="flex gap-2">
              <span className="text-[var(--color-primary)] font-bold">1.</span>
              <span>You can save up to {MAX_INTERESTS} animals at a time. Remove one to add another when the cap is reached.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-primary)] font-bold">2.</span>
              <span>Status labels reflect real-time adoption availability from the shelter.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-primary)] font-bold">3.</span>
              <span>View full animal profiles before adding them to your interest list.</span>
            </li>
          </ul>
        </aside>
      </div>
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
