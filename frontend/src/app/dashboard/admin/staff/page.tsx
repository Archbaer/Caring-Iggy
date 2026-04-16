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
      <div className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Employee records</p>
          <h1 className="page-title">Staff management</h1>
          <p className="page-copy">
            The employee directory could not be loaded right now. Please try again in a moment.
          </p>
        </section>

        <section className="empty-state">
          <p className="eyebrow">Directory error</p>
          <h2 className="panel-title">We couldn&apos;t load employee records.</h2>
          <p className="panel-copy">{result.message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Employee records</p>
        <h1 className="page-title">Staff management</h1>
        <p className="page-copy">
          Manage shelter staff and administrator accounts. Create, update, or deactivate employee access.
        </p>
      </section>

      {result.employees.length > 0 ? (
        <section className="route-grid">
          {result.employees.map((employee) => (
            <Card key={employee.id} variant="route">
              <span className="status-badge">{employee.role}</span>
              <h2 className="route-card-title">{employee.name}</h2>
              <p className="route-card-copy">
                {employee.email}
                {employee.telephone ? ` · ${employee.telephone}` : ""}
              </p>
              <div className="route-actions">
                <ActionLink href={`/dashboard/admin/staff/${employee.id}`} variant="chip">
                  Open record
                </ActionLink>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <p className="eyebrow">No employee records</p>
          <h2 className="panel-title">No staff accounts yet.</h2>
          <p className="panel-copy">
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
