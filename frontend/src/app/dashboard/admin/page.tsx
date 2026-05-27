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
    <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-8 bg-canvas-pattern">
      {/* Header panel */}
      <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] mb-8">
        <div className="flex flex-col gap-2">
          <Eyebrow className="text-[var(--color-accent)]">Administration</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--color-ink)] mb-2">
            Admin workspace
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Manage your shelter&apos;s adopters, staff, and animals
          </p>
        </div>

        {/* Stat cards */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-6">
          <div className="rounded-2xl bg-[var(--color-primary-pale)] p-6 text-center">
            <dt className="text-xs text-[var(--color-ink-soft)] font-medium">Adopters</dt>
            <dd className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-primary)]">{adopterCount}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-primary-pale)] p-6 text-center">
            <dt className="text-xs text-[var(--color-ink-soft)] font-medium">Staff</dt>
            <dd className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-primary)]">{staffCount}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-primary-pale)] p-6 text-center">
            <dt className="text-xs text-[var(--color-ink-soft)] font-medium">Animals</dt>
            <dd className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-primary)]">{animalCount}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-accent-pale)] p-6 text-center">
            <dt className="text-xs text-[var(--color-ink-soft)] font-medium">Active</dt>
            <dd className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-accent)]">{animalCount}</dd>
          </div>
        </dl>
      </section>

      {/* Route cards */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        <Card variant="route" className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300">
          <Eyebrow>People</Eyebrow>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-2">
            Adopters
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
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

        <Card variant="route" className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300">
          <Eyebrow>Team</Eyebrow>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-2">
            Staff members
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
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

        <Card variant="route" className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300">
          <Eyebrow>Animals</Eyebrow>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-2">
            Animal catalog
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            {animalCount === 0
              ? "No animals in the catalog yet"
              : `${animalCount} animal${animalCount === 1 ? "" : "s"} across all statuses`}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionLink href="/animals" variant="chip">
              View catalog
            </ActionLink>
            <ActionLink href="/dashboard/animals/new" variant="chip">
              New entries
            </ActionLink>
          </div>
        </Card>

        <Card variant="route" className="rounded-3xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300">
          <Eyebrow>Analytics</Eyebrow>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-2">
            Reports
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            Monthly intake and adoption data
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionLink href="/dashboard/admin/reports" variant="chip">
              View reports
            </ActionLink>
          </div>
        </Card>
      </section>
    </div>
  );
}
