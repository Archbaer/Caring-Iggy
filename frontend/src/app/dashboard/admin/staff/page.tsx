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
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      {/* Back button */}
      <div className="mb-6">
        <a
          href="/dashboard/admin"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          ← Dashboard
        </a>
      </div>

      {/* Hero header */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 pt-8 animate-fade-up">
        <div className="flex flex-col gap-2">
          <Eyebrow>Employee records</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
            Staff management
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Manage shelter staff and administrator accounts. Create, update, or deactivate employee access.
          </p>
        </div>
      </section>

      {result.kind === "error" ? (
        <section className="my-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 text-center">
          <Eyebrow>Directory error</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">
            We couldn&apos;t load employee records.
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
        </section>
      ) : result.employees.length > 0 ? (
        <section className="my-6 grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4 animate-fade-up delay-1">
          {result.employees.map((employee) => (
            <Card key={employee.id} variant="route">
              <Eyebrow>{employee.role}</Eyebrow>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-2">
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
        <section className="my-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 text-center">
          <Eyebrow>No employee records</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">
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
