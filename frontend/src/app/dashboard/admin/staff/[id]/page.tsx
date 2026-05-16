import Link from "next/link";
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
      <div className="max-w-[80rem] mx-auto px-6 py-8">
        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] border border-[var(--color-border)] p-8">
          <p className="text-xs text-[var(--color-ink-faint)] font-medium">Admin route</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mt-2 mb-2">Staff record unavailable</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">The protected staff detail route could not be loaded.</p>
        </section>

        <nav className="flex items-center gap-2 mt-6">
          <Link href="/dashboard/admin/staff" className="text-[var(--color-accent)] font-semibold text-sm hover:underline">
            ← Staff
          </Link>
        </nav>

        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs text-[var(--color-ink-faint)] font-medium">Detail error</p>
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
