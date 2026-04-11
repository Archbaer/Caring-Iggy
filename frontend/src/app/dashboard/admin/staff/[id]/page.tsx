import { ActionLink } from "@/components/ui/action-link";
import {
  fetchAdminEmployeeDetail,
  type AdminEmployeeDetail,
} from "@/lib/api/admin";
import { getRequiredRoleSession } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ id: string }>;
};

type AdminStaffDetailResult =
  | { kind: "success"; employee: AdminEmployeeDetail }
  | { kind: "error"; message: string };

export const dynamic = "force-dynamic";

export default async function AdminStaffDetailPage({ params }: PageProps) {
  await getRequiredRoleSession("ADMIN");
  const { id } = await params;
  const result = await loadAdminStaffDetail(id);

  if (result.kind === "error") {
    return (
      <div className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Admin route</p>
          <h1 className="page-title">Staff record unavailable</h1>
          <p className="page-copy">The protected staff detail route could not be loaded.</p>
        </section>

        <section className="empty-state">
          <p className="eyebrow">Detail error</p>
          <h2 className="panel-title">We couldn&apos;t load this employee record.</h2>
          <p className="panel-copy">{result.message}</p>
          <ActionLink href="/dashboard/admin/staff" variant="chip">
            Back to staff directory
          </ActionLink>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">{result.employee.name}</h1>
        <p className="page-copy">
          Administrator-only employee detail route for <strong>{id}</strong>. Server authorization is rechecked before any role metadata is shown.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Identity</p>
          <h2 className="panel-title">Account metadata</h2>
          <ul className="detail-list">
            <li>
              <strong>Email:</strong> {result.employee.email}
            </li>
            <li>
              <strong>Telephone:</strong> {result.employee.telephone ?? "No telephone on file."}
            </li>
            <li>
              <strong>Role:</strong> {result.employee.role}
            </li>
            <li>
              <strong>Created:</strong> {result.employee.createdAt ?? "Unavailable"}
            </li>
            <li>
              <strong>Updated:</strong> {result.employee.updatedAt ?? "Unavailable"}
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}

async function loadAdminStaffDetail(id: string): Promise<AdminStaffDetailResult> {
  try {
    return {
      kind: "success",
      employee: await fetchAdminEmployeeDetail(id),
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "The employee record is temporarily unavailable.",
    };
  }
}
