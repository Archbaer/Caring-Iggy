import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  fetchAdminEmployees,
  type AdminEmployeeSummary,
} from "@/lib/api/admin";
import { getRequiredRoleSession } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

type AdminStaffResult =
  | { kind: "success"; employees: AdminEmployeeSummary[] }
  | { kind: "error"; message: string };

export default async function AdminStaffPage() {
  await getRequiredRoleSession("ADMIN");
  const result = await loadAdminStaff();

  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-8 bg-canvas-pattern">
      {/* Back button */}
      <div className="mb-6">
        <a
          href="/dashboard/admin"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-accent)] font-semibold transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-deep)]"
        >
          ← Dashboard
        </a>
      </div>

      {/* Hero header */}
      <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] mb-8">
        <div className="flex flex-col gap-2">
          <Eyebrow className="text-[var(--color-accent)]">Employee records</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-2">
            Staff management
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Manage shelter staff and administrator accounts. Create, update, or deactivate employee access.
          </p>
        </div>
      </section>

      {result.kind === "error" ? (
        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] text-center">
          <Eyebrow>Directory error</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)] mb-2">
            We couldn&apos;t load employee records.
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
        </section>
      ) : result.employees.length > 0 ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {result.employees.map((employee) => (
            <Card key={employee.id} variant="route" className="rounded-3xl bg-white shadow-[var(--shadow-card)] border border-[var(--color-border)] p-6 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300">
              <Eyebrow>{employee.role}</Eyebrow>
              <h2 className="text-xl font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-2">
                {employee.name}
              </h2>
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
                {employee.email}
              </p>
              {employee.telephone && (
                <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
                  {employee.telephone}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <ActionLink href={`/dashboard/admin/staff/${employee.id}`} variant="chip">
                  Open record
                </ActionLink>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] text-center">
          <Eyebrow>No employee records</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-ink)] mb-2">
            No staff accounts yet.
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Staff and admin accounts will appear here once created.
          </p>
        </section>
      )}
    </div>
  );
}

async function loadAdminStaff(): Promise<AdminStaffResult> {
  try {
    return {
      kind: "success",
      employees: await fetchAdminEmployees(),
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "The employee directory is temporarily unavailable.",
    };
  }
}
