import { DashboardSectionNav } from "@/components/dashboard/dashboard-section-nav";
import { PreferencesForm } from "@/components/dashboard/preferences-form";
import { ActionLink } from "@/components/ui/action-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { fetchAdopterProfile } from "@/lib/api/adopter";
import { fetchAnimalsForView } from "@/lib/api/animals";
import { getRequiredRoleSession } from "@/lib/auth/server-session";
import type { AdopterProfile } from "@/lib/types/adopter";

export const dynamic = "force-dynamic";

type PreferencesData =
  | { kind: "success"; profile: AdopterProfile; availableTypes: string[]; availableBreeds: string[] }
  | { kind: "error"; message: string };

async function loadPreferencesData(profileId: string): Promise<PreferencesData> {
  try {
    const [profile, animals] = await Promise.all([
      fetchAdopterProfile(profileId),
      fetchAnimalsForView().catch(() => []),
    ]);
    if (!profile) {
      return {
        kind: "error",
        message: "Your adopter profile is not linked to this account yet.",
      };
    }

    return {
      kind: "success",
      profile,
      availableTypes: Array.from(new Set(animals.map((animal) => animal.animalType))),
      availableBreeds: Array.from(
        new Set(animals.flatMap((a) => (a.breed ? [a.breed] : [])).values()),
      ).sort(),
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "Preferences are temporarily unavailable.",
    };
  }
}

export default async function DashboardPreferencesPage() {
  const session = await getRequiredRoleSession("ADOPTER");
  const result: PreferencesData = session.profileId
    ? await loadPreferencesData(session.profileId)
    : { kind: "error", message: "Your adopter profile is not linked to this account yet." };

  if (result.kind === "error") {
    return (
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8">
          <Eyebrow>Protected route</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
            Preferences
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            We couldn&apos;t load your saved adopter preferences.
          </p>
        </section>

        <DashboardSectionNav currentPath="/dashboard/preferences" />

        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Preferences error</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Try loading your preferences again.</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
          <ActionLink href="/dashboard/preferences" variant="chip">
            Retry preferences
          </ActionLink>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 grid grid-cols-[1.35fr_0.9fr] gap-5 items-start animate-fade-up">
        <div className="flex flex-col gap-2">
          <Eyebrow>Protected route</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
            Preferences
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Tell our team what kind of animal you are looking for — species, breed, age, and anything else that matters to your household.
          </p>
        </div>

        <div className="flex flex-col gap-1 text-sm text-[var(--color-ink-soft)]">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Current summary</p>
          <p className="text-sm text-[var(--color-ink-soft)]">
            {result.profile.preferences.preferredAnimalTypes.length > 0
              ? `Saved: ${result.profile.preferences.preferredAnimalTypes.join(", ")}`
              : "No preferences saved yet."}
          </p>
        </div>
      </section>

      <DashboardSectionNav currentPath="/dashboard/preferences" />

      <PreferencesForm
        initialPreferences={result.profile.preferences}
        availableTypes={result.availableTypes}
        availableBreeds={result.availableBreeds}
      />
    </div>
  );
}
