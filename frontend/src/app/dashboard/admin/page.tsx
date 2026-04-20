import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  fetchAdminAdopters,
  fetchAdminEmployees,
} from "@/lib/api/admin";
import { fetchAnimals } from "@/lib/api/animals";
import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await getRequiredRoleGroupSession(["ADMIN"]);

  const [adoptersResult, employeesResult, animalsResult] = await Promise.all([
    fetchAdminAdopters(),
    fetchAdminEmployees(),
    fetchAnimals(),
  ]);

  const adopterCount = adoptersResult.length;
  const staffCount = employeesResult.length;
  const animalCount = animalsResult.length;

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      {/* Hero card — matches staff dashboard hero style */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 grid grid-cols-[1.35fr_0.9fr] gap-5 items-start animate-fade-up">
        <div className="flex flex-col gap-2">
          <Eyebrow>Admin workspace</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Manage your shelter&apos;s adopters, staff, and animals
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Adopters</dt>
            <dd className="text-sm font-medium text-[var(--color-ink)] mt-1">{adopterCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Staff</dt>
            <dd className="text-sm font-medium text-[var(--color-ink)] mt-1">{staffCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Animals</dt>
            <dd className="text-sm font-medium text-[var(--color-ink)] mt-1">{animalCount}</dd>
          </div>
        </dl>
      </section>

      {/* Card grid — matches staff dashboard card grid style */}
      <section className="my-6 grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4 animate-fade-up delay-1">
        <Card variant="route">
          <Eyebrow>People</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-2">
            Adopters
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            {adopterCount === 0
              ? "No adopter accounts yet"
              : `${adopterCount} adopter${adopterCount === 1 ? "" : "s"} in the system`}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionLink href="/dashboard/admin/adopters" variant="chip">
              View adopters
            </ActionLink>
          </div>
        </Card>

        <Card variant="route">
          <Eyebrow>Team</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-2">
            Staff members
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            {staffCount === 0
              ? "No staff accounts yet"
              : `${staffCount} team member${staffCount === 1 ? "" : "s"} on staff`}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionLink href="/dashboard/admin/staff" variant="chip">
              View staff
            </ActionLink>
          </div>
        </Card>

        <Card variant="route">
          <Eyebrow>Animals</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-2">
            Animal catalog
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            {animalCount === 0
              ? "No animals in the catalog yet"
              : `${animalCount} animal${animalCount === 1 ? "" : "s"} across all statuses`}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionLink href="/animals" variant="chip">
              View catalog
            </ActionLink>
            <ActionLink href="/dashboard/admin/animals/new" variant="chip">
              New entries
            </ActionLink>
          </div>
        </Card>
      </section>
    </div>
  );
}
