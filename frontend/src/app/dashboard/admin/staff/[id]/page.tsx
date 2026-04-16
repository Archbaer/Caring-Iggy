import {
  fetchAdminEmployeeDetail,
  type AdminEmployeeDetail,
} from "@/lib/api/admin";
import { getRequiredRoleSession } from "@/lib/auth/server-session";

import { AdminStaffDetailClient } from "@/components/admin/staff-detail-client";

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

        <nav className="breadcrumb">
          <a href="/dashboard/admin/staff" className="link-chip">
            ← Staff
          </a>
        </nav>

        <section className="empty-state">
          <p className="eyebrow">Detail error</p>
          <h2 className="panel-title">We couldn&apos;t load this employee record.</h2>
          <p className="panel-copy">{result.message}</p>
        </section>
      </div>
    );
  }

  return (
    <AdminStaffDetailClient
      employee={result.employee}
      onUpdate={() => {}}
      onDelete={() => {}}
    />
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