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
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Admin route</p>
          <h1 className="page-title">Staff record unavailable</h1>
          <p className="page-copy">The protected staff detail route could not be loaded.</p>
        </section>

        <nav className="flex items-center gap-2">
          <a href="/dashboard/admin/staff" className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
            ← Staff
          </a>
        </nav>

        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Detail error</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">We couldn&apos;t load this employee record.</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
        </section>
      </div>
    );
  }

  return (
    <AdminStaffDetailClient
      employee={result.employee}
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