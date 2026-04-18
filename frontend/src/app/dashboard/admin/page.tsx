import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";
import { fetchAdminAdopters } from "@/lib/api/admin";
import { fetchAnimals } from "@/lib/api/animals";
import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await getRequiredRoleGroupSession(["ADMIN"]);

  const [adoptersResult, animalsResult] = await Promise.all([
    fetchAdminAdopters(),
    fetchAnimals(),
  ]);

  const adopterCount = adoptersResult.length;
  const animalCount = animalsResult.length;

  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-8">
      <Eyebrow className="mb-3">Admin workspace</Eyebrow>
      <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl font-medium text-[var(--color-ink)] mb-10 tracking-[-0.02em] leading-[1.05]">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Adopters stat card */}
        <Card variant="hero" className="p-8 sm:p-10 flex flex-col gap-8 animate-fade-up">
          <div>
            <Eyebrow className="mb-3">People</Eyebrow>
            <p className="font-[family-name:var(--font-display)] text-8xl sm:text-9xl font-medium text-[var(--color-ink)] tracking-[-0.04em] leading-[0.9]">
              {adopterCount}
            </p>
            <p className="mt-3 text-lg font-medium text-[var(--color-ink)]">
              {adopterCount === 1 ? "Registered adopter" : "Registered adopters"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {adopterCount === 0
                ? "No adopter accounts yet"
                : `${adopterCount} adopter${adopterCount === 1 ? "" : "s"} in the system`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ActionLink href="/dashboard/admin/adopters" variant="chip">
              View adopters
            </ActionLink>
            <ActionLink href="/dashboard/admin/staff" variant="chip">
              Manage staff
            </ActionLink>
          </div>
        </Card>

        {/* Animals stat card */}
        <Card variant="hero" className="p-8 sm:p-10 flex flex-col gap-8 animate-fade-up delay-1">
          <div>
            <Eyebrow className="mb-3">Animals</Eyebrow>
            <p className="font-[family-name:var(--font-display)] text-8xl sm:text-9xl font-medium text-[var(--color-ink)] tracking-[-0.04em] leading-[0.9]">
              {animalCount}
            </p>
            <p className="mt-3 text-lg font-medium text-[var(--color-ink)]">
              {animalCount === 1 ? "Animal in catalog" : "Animals in catalog"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {animalCount === 0
                ? "No animals in the catalog yet"
                : `${animalCount} animal${animalCount === 1 ? "" : "s"} across all statuses`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ActionLink href="/animals" variant="chip">
              View catalog
            </ActionLink>
            <ActionLink href="/animals/new" variant="chip">
              Add animal
            </ActionLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
