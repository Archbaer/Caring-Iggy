import { redirect } from "next/navigation";

import { DashboardSectionNav } from "@/components/dashboard/dashboard-section-nav";
import { InterestStatusList } from "@/components/dashboard/interest-status-list";
import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { fetchAdopterProfile } from "@/lib/api/adopter";
import { fetchAnimalForView } from "@/lib/api/animals";
import { LOGIN_ROUTE } from "@/lib/auth/role-check";
import { getCurrentSession } from "@/lib/auth/server-session";
import { MAX_INTERESTS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect(`${LOGIN_ROUTE}?redirect=/dashboard`);
  }

  if (session.role !== "ADOPTER") {
    return (
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8 grid grid-cols-[1.35fr_0.9fr] gap-5 items-start">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Staff workspace</p>
            <h1 className="page-title">Team dashboard</h1>
            <p className="page-copy">
              Manage animal records and open administrative workspaces.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
          <Card variant="route">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Animal records</p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Manage animals</h2>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Browse animal profiles and open update/delete controls.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionLink href="/animals" variant="chip">
                Manage animals
              </ActionLink>
            </div>
          </Card>

          <Card variant="route">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Animal records</p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Add animal</h2>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Create a new animal profile in the shelter catalog.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionLink href="/dashboard/admin/animals/new" variant="chip">
                Add animal
              </ActionLink>
            </div>
          </Card>

          {session.role === "ADMIN" ? (
            <>
              <Card variant="route">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Adopter records</p>
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">Adopter management</h2>
                <p className="text-sm text-[var(--color-ink-soft)]">
                  View and manage adopter profiles and interest history.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionLink href="/dashboard/admin/adopters" variant="chip">
                    Adopter records
                  </ActionLink>
                </div>
              </Card>

              <Card variant="route">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Employee records</p>
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">Staff management</h2>
                <p className="text-sm text-[var(--color-ink-soft)]">
                  Open employee directory and edit administrator access.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionLink href="/dashboard/admin/staff" variant="chip">
                    Staff records
                  </ActionLink>
                </div>
              </Card>
            </>
          ) : null}
        </section>
      </div>
    );
  }

  const result = session.profileId
    ? await loadDashboardData(session.profileId)
    : { kind: "error" as const, message: "Your adopter profile is not linked to this account yet." };

  if (result.kind === "error") {
    return (
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Protected route</p>
          <h1 className="page-title">Adopter dashboard</h1>
          <p className="page-copy">Your account is protected, but dashboard data could not be loaded.</p>
        </section>

        <DashboardSectionNav currentPath="/dashboard" />

        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Dashboard error</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">We couldn&apos;t load your adopter workspace.</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
          <ActionLink href="/dashboard" variant="chip">
            Retry dashboard
          </ActionLink>
        </section>
      </div>
    );
  }

  const { profile, interestAnimals } = result;
  const preferenceSummary = profile.preferences.preferredAnimalTypes.length
    ? profile.preferences.preferredAnimalTypes.join(", ")
    : "No animal types saved yet.";
  const ageSummary =
    typeof profile.preferences.minAge === "number" || typeof profile.preferences.maxAge === "number"
      ? `${profile.preferences.minAge ?? 0} to ${profile.preferences.maxAge ?? "any"}`
      : "No age range saved yet.";

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8 grid grid-cols-[1.35fr_0.9fr] gap-5 items-start">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Protected route</p>
          <h1 className="page-title">Adopter dashboard</h1>
          <p className="page-copy">
            Keep your preferences up to date, track up to {MAX_INTERESTS} interested animals, and review real animal availability without any fake approval workflow labels.
          </p>
        </div>

        <dl className="grid grid-cols-[repeat(3,1fr)] gap-4">
          <div>
            <dt>Name</dt>
            <dd>{profile.name}</dd>
          </div>
          <div>
            <dt>Interested animals</dt>
            <dd>
              {profile.interests.length} / {MAX_INTERESTS}
            </dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>{profile.email}</dd>
          </div>
        </dl>
      </section>

      <DashboardSectionNav currentPath="/dashboard" />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Preferences</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Saved adoption preferences</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <strong>Animal types:</strong> {preferenceSummary}
            </li>
            <li>
              <strong>Age range:</strong> {ageSummary}
            </li>
            <li>
              <strong>Notes:</strong> {profile.preferences.notes?.trim() || "No notes saved yet."}
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <ActionLink href="/dashboard/preferences" variant="chip">
              Edit preferences
            </ActionLink>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Interests</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Current interested animals</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Keep no more than {MAX_INTERESTS} interested animals saved at once. This cap is enforced before the request leaves the browser and again in the protected BFF.
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionLink href="/dashboard/interests" variant="chip">
              Manage interests
            </ActionLink>
          </div>
        </Card>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Status</p>
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">Interest status snapshot</h2>
        <InterestStatusList
          animals={interestAnimals}
          emptyTitle="No interested animals saved"
          emptyCopy="Once you save an animal to your interested list, its real adoption status will appear here from the shared status map."
        />
      </section>
    </div>
  );
}

async function loadDashboardData(profileId: string) {
  try {
    const profile = await fetchAdopterProfile(profileId);
    const interestAnimals = (
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
      profile,
      interestAnimals,
    };
  } catch (error) {
    return {
      kind: "error" as const,
      message:
        error instanceof Error
          ? error.message
          : "The adopter dashboard is temporarily unavailable.",
    };
  }
}
