import { ActionLink } from "@/components/ui/action-link";
import {
  fetchAdminAdopterDetail,
  type AdminAdopterDetail,
} from "@/lib/api/admin";
import { getRequiredRoleSession } from "@/lib/auth/server-session";

import { AdminAdopterDetailClient } from "@/components/admin/adopter-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

type AdminAdopterDetailResult =
  | { kind: "success"; adopter: AdminAdopterDetail }
  | { kind: "error"; message: string };

export const dynamic = "force-dynamic";

export default async function AdminAdopterDetailPage({ params }: PageProps) {
  await getRequiredRoleSession("ADMIN");
  const { id } = await params;
  const result = await loadAdminAdopterDetail(id);

  if (result.kind === "error") {
    return (
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Admin route</p>
          <h1 className="page-title">Adopter record unavailable</h1>
          <p className="page-copy">The protected adopter detail route could not be loaded.</p>
        </section>

        <nav className="flex items-center gap-2">
          <ActionLink href="/dashboard/admin/adopters" variant="chip">
            ← Adopters
          </ActionLink>
        </nav>

        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Detail error</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">We couldn&apos;t load this adopter record.</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">{result.message}</p>
        </section>
      </div>
    );
  }

  return <AdminAdopterDetailClient adopter={result.adopter} />;
}

async function loadAdminAdopterDetail(
  id: string,
): Promise<AdminAdopterDetailResult> {
  try {
    return {
      kind: "success",
      adopter: await fetchAdminAdopterDetail(id),
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "The adopter record is temporarily unavailable.",
    };
  }
}