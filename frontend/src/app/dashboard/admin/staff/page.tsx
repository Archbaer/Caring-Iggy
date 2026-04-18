import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
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

  if (result.kind === "error") {
    return (
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Employee records</p>
          <h1 className="page-title">Staff management</h1>
          <p className="page-copy">
            The employee directory could not be loaded right now. Please try again in a moment.
          </p>
        </section>

        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Directory error</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">We couldn&apos;t load employee records.</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Employee records</p>
        <h1 className="page-title">Staff management</h1>
        <p className="page-copy">
          Manage shelter staff and administrator accounts. Create, update, or deactivate employee access.
        </p>
      </section>

      {result.employees.length > 0 ? (
        <section className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
          {result.employees.map((employee) => (
            <Card key={employee.id} variant="route">
              <span className="ci-badge">{employee.role}</span>
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">{employee.name}</h2>
              <p className="text-sm text-[var(--color-ink-soft)]">
                {employee.email}
                {employee.telephone ? ` · ${employee.telephone}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionLink href={`/dashboard/admin/staff/${employee.id}`} variant="chip">
                  Open record
                </ActionLink>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">No employee records</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">No staff accounts yet.</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
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
