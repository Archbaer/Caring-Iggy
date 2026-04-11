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
          <p className="eyebrow">Admin route</p>
          <h1 className="page-title">Staff management</h1>
          <p className="page-copy">
            Administrator-only staff oversight is protected, but the employee directory could not be loaded right now.
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
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">Staff management</h1>
        <p className="page-copy">
          Administrator-only staff oversight stays isolated from the generic dashboard. Employee records render from user-service data instead of placeholder shells.
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
          <h2 className="panel-title">No staff or admin accounts are available.</h2>
          <p className="panel-copy">
            The protected staff route is active, but user-service did not return any employee records.
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
