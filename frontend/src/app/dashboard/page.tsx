import { redirect } from "next/navigation";

import { DashboardSectionNav } from "@/components/dashboard/dashboard-section-nav";
import { InterestStatusList } from "@/components/dashboard/interest-status-list";
import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
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

  if (session.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (session.role !== "ADOPTER") {
    return (
      <div className="max-w-[var(--max-width-wide)] mx-auto p-6 sm:p-8 bg-canvas-pattern">
        {/* Staff/admin hero */}
        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] animate-fade-up">
          <div className="flex flex-col gap-2">
            <Eyebrow>Staff workspace</Eyebrow>
            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-ink)] mb-2">
              Team dashboard
            </h1>
            <p className="text-[var(--color-ink-soft)] mt-2">
              Manage animal records and open administrative workspaces.
            </p>
          </div>
        </section>

        <section className="my-6 animate-fade-up delay-1">
          <Card variant="route" className="text-center max-w-sm mx-auto">
            <Eyebrow>Animals</Eyebrow>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--color-ink)] mb-2">
              Animal records
            </h2>
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Browse, manage, and add animal profiles to the shelter catalog.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              <ActionLink href="/animals" variant="chip">
                Manage animals
              </ActionLink>
              <ActionLink href="/dashboard/animals/new" variant="chip">
                Add animals
              </ActionLink>
            </div>
          </Card>
        </section>
      </div>
    );
  }

  const result = session.profileId
    ? await loadDashboardData(session.profileId)
    : { kind: "error" as const, message: "Your adopter profile is not linked to this account yet." };

  if (result.kind === "error") {
    return (
      <div className="max-w-[var(--max-width-wide)] mx-auto p-6 sm:p-8 bg-canvas-pattern">
        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] animate-fade-up">
          <Eyebrow>Protected route</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-ink)] mb-2">
            Adopter dashboard
          </h1>
          <p className="text-[var(--color-ink-soft)] mt-2">
            Your account is protected, but dashboard data could not be loaded.
          </p>
        </section>

        <DashboardSectionNav currentPath="/dashboard" />

        <section className="flex flex-col gap-3 py-8 text-center animate-fade-up delay-1">
          <Eyebrow>Dashboard error</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)]">
            We couldn&apos;t load your adopter workspace.
          </h2>
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
    <div className="max-w-[var(--max-width-wide)] mx-auto p-6 sm:p-8 bg-canvas-pattern">
      {/* Adopter hero */}
      <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] animate-fade-up">
        <div className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em] text-[var(--color-accent)] mb-2">Dashboard</span>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-ink)]">
            Welcome back, {profile.name}
          </h1>
          <p className="text-[var(--color-ink-soft)] mt-2">
            Keep your preferences up to date, track up to {MAX_INTERESTS} interested animals, and review real animal availability without any fake approval workflow labels.
          </p>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="rounded-2xl bg-[var(--color-primary-pale)] p-6 text-center">
            <dt className="text-xs text-[var(--color-ink-soft)] font-medium mt-1">Name</dt>
            <dd className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-primary)]">{profile.name}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-primary-pale)] p-6 text-center">
            <dt className="text-xs text-[var(--color-ink-soft)] font-medium mt-1">Interested</dt>
            <dd className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-primary)]">
              {profile.interests.length} / {MAX_INTERESTS}
            </dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-primary-pale)] p-6 text-center">
            <dt className="text-xs text-[var(--color-ink-soft)] font-medium mt-1">Contact</dt>
            <dd className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-primary)]">{profile.email}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-primary-pale)] p-6 text-center">
            <dt className="text-xs text-[var(--color-ink-soft)] font-medium mt-1">Types</dt>
            <dd className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-primary)]">{profile.preferences.preferredAnimalTypes.length || "—"}</dd>
          </div>
        </dl>
      </section>

      <DashboardSectionNav currentPath="/dashboard" />

      <section className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-5 animate-fade-up delay-1">
        <div className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300 group">
          <Eyebrow>Preferences</Eyebrow>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Saved adoption preferences</h2>
          <ul className="flex flex-col gap-2 text-sm text-[var(--color-ink-soft)] mt-3">
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
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionLink href="/dashboard/preferences" variant="chip">
              Edit preferences
            </ActionLink>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300 group">
          <Eyebrow>Interests</Eyebrow>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Current interested animals</h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mt-1">
            Keep no more than {MAX_INTERESTS} interested animals saved at once. This cap is enforced before the request leaves the browser and again in the protected BFF.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionLink href="/dashboard/interests" variant="chip">
              Manage interests
            </ActionLink>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300 group">
          <Eyebrow>Matches</Eyebrow>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Find your match</h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mt-1">
            See animal-adopter matches curated by our staff based on your preferences.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionLink href="/dashboard/matches" variant="chip">
              View matches
            </ActionLink>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300 group">
          <Eyebrow>Browse</Eyebrow>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">All animals</h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mt-1">
            Browse the full shelter catalog and discover new profiles.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionLink href="/animals" variant="chip">
              Browse animals
            </ActionLink>
          </div>
        </div>
      </section>

      <section className="lg:grid lg:grid-cols-[1fr_300px] gap-6 animate-fade-up delay-2">
        <div className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 flex flex-col gap-4">
          <Eyebrow>Status</Eyebrow>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">
            Interest status snapshot
          </h2>
          <InterestStatusList
            animals={interestAnimals}
            emptyTitle="No interested animals saved"
            emptyCopy="Once you save an animal to your interested list, its real adoption status will appear here from the shared status map."
          />
        </div>

        <aside className="bg-[var(--color-primary-pale)] rounded-3xl p-6 border border-[var(--color-border)] self-start sticky top-24">
          <h3 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-4">Quick Tips</h3>
          <ul className="flex flex-col gap-3 text-sm text-[var(--color-ink-soft)]">
            <li className="flex gap-2">
              <span className="text-[var(--color-primary)] font-bold">1.</span>
              <span>Update preferences regularly to improve match quality.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-primary)] font-bold">2.</span>
              <span>Keep your interest list current — remove animals you&apos;re no longer considering.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-primary)] font-bold">3.</span>
              <span>Check back often — animal availability changes daily.</span>
            </li>
          </ul>
        </aside>
      </section>
    </div>
  );
}

async function loadDashboardData(profileId: string) {
  try {
    const profile = await fetchAdopterProfile(profileId);
    if (!profile) {
      return {
        kind: "error" as const,
        message: "Your adopter profile is not linked to this account yet.",
      };
    }
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
