import { ActionLink } from "@/components/ui/action-link";
import { Badge } from "@/components/ui/badge";
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

function getRoleBadgeVariant(role: string): "admin" | "staff" | "volunteer" | "muted" {
  switch (role.toUpperCase()) {
    case "ADMIN":     return "admin";
    case "STAFF":     return "staff";
    case "VOLUNTEER": return "volunteer";
    default:          return "muted";
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AdminStaffPage() {
  await getRequiredRoleSession("ADMIN");
  const result = await loadAdminStaff();

  return (
    <div className="ci-admin-canvas">
      {/* Page header */}
      <div className="ci-admin-page-header animate-fade-up">
        <Eyebrow className="mb-3">Employee records</Eyebrow>
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium text-[var(--color-ink)] mb-2 tracking-[-0.02em] leading-[1.05]">
          Staff management
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
          Manage shelter staff and administrator accounts. Create, update, or deactivate employee access.
        </p>
      </div>

      {result.kind === "error" ? (
        <div className="ci-admin-page-header animate-fade-up delay-1 text-center">
          <Eyebrow className="mb-3">Directory error</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">
            We couldn&apos;t load employee records.
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
        </div>
      ) : result.employees.length > 0 ? (
        <div className="ci-staff-grid animate-fade-up delay-1">
          {result.employees.map((employee) => (
            <div key={employee.id} className="ci-staff-card">
              {/* Role badge */}
              <Badge variant={getRoleBadgeVariant(employee.role)}>
                {employee.role}
              </Badge>

              {/* Avatar + name row */}
              <div className="flex items-center gap-4">
                <div className="ci-staff-avatar">
                  <span className="font-[family-name:var(--font-display)] text-xl text-[var(--color-primary)]">
                    {getInitials(employee.name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] tracking-[-0.02em] truncate">
                    {employee.name}
                  </h2>
                  <p className="text-sm text-[var(--color-ink-soft)] truncate">
                    {employee.email}
                  </p>
                  {employee.telephone && (
                    <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">
                      · {employee.telephone}
                    </p>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="mt-auto pt-2">
                <ActionLink href={`/dashboard/admin/staff/${employee.id}`} variant="chip">
                  Open record
                </ActionLink>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ci-admin-page-header animate-fade-up delay-1 text-center">
          <Eyebrow className="mb-3">No employee records</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-2">
            No staff accounts yet.
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Staff and admin accounts will appear here once created.
          </p>
        </div>
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
