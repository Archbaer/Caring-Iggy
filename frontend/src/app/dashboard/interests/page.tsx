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
      <div className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Protected route</p>
          <h1 className="page-title">Interested animals</h1>
          <p className="page-copy">We couldn&apos;t load your interested animal list.</p>
        </section>

        <DashboardSectionNav currentPath="/dashboard/interests" />

        <section className="empty-state">
          <p className="eyebrow">Interests error</p>
          <h2 className="panel-title">Try loading your interested animals again.</h2>
          <p className="panel-copy">{result.message}</p>
          <ActionLink href="/dashboard/interests" variant="chip">
            Retry interests
          </ActionLink>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="page-hero dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Protected route</p>
          <h1 className="page-title">Interested animals</h1>
          <p className="page-copy">
            Save up to {MAX_INTERESTS} animal profiles, review their real current adoption status, and keep your shortlist current without inventing approval or rejection states.
          </p>
        </div>

        <div className="dashboard-hero-note">
          <p className="eyebrow">Interest cap</p>
          <p className="panel-copy">
            {result.currentAnimals.length} of {MAX_INTERESTS} interested animals saved.
          </p>
        </div>
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
