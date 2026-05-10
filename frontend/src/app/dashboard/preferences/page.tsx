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
      <div className="max-w-[80rem] mx-auto bg-canvas-pattern p-6 sm:p-8">
        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)]">
          <Eyebrow>Protected route</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-2">
            Preferences
          </h1>
          <p className="text-[var(--color-ink-soft)] mt-2">
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
    <div className="max-w-[80rem] mx-auto bg-canvas-pattern p-6 sm:p-8">
      <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] animate-fade-up">
        <div className="flex flex-col gap-2">
          <Eyebrow>Protected route</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-2">
            Preferences
          </h1>
          <p className="text-[var(--color-ink-soft)] mt-2">
            Tell our team what kind of animal you are looking for — species, breed, age, and anything else that matters to your household.
          </p>
        </div>

        <div className="flex flex-col gap-1 text-sm text-[var(--color-ink-soft)] mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Current summary</p>
          <p className="text-sm text-[var(--color-ink-soft)]">
            {result.profile.preferences.preferredAnimalTypes.length > 0
              ? `Saved: ${result.profile.preferences.preferredAnimalTypes.join(", ")}`
              : "No preferences saved yet."}
          </p>
        </div>
      </section>

      <DashboardSectionNav currentPath="/dashboard/preferences" />

      <div className="lg:grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <PreferencesForm
            initialPreferences={result.profile.preferences}
            availableTypes={result.availableTypes}
            availableBreeds={result.availableBreeds}
          />
        </div>

        <aside className="bg-[var(--color-primary-pale)] rounded-3xl p-6 border border-[var(--color-border)] self-start sticky top-24">
          <h3 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-4">About Preferences</h3>
          <ul className="flex flex-col gap-3 text-sm text-[var(--color-ink-soft)]">
            <li className="flex gap-2">
              <span className="text-[var(--color-primary)] font-bold">1.</span>
              <span>Select animal types, breeds, and age ranges that match your lifestyle.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-primary)] font-bold">2.</span>
              <span>Include notes about your home environment to help staff make better matches.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-primary)] font-bold">3.</span>
              <span>Update anytime — your preferences guide which animals we highlight for you.</span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
