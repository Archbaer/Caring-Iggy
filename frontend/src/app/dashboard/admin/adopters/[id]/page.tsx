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
      <div className="max-w-[80rem] mx-auto px-6 py-8">
        <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] border border-[var(--color-border)] p-8">
          <p className="text-xs text-[var(--color-ink-faint)] font-medium">Admin route</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mt-2 mb-2">Adopter record unavailable</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">The protected adopter detail route could not be loaded.</p>
        </section>

        <nav className="flex items-center gap-2 mt-6">
          <ActionLink href="/dashboard/admin/adopters" variant="chip">
            ← Adopters
          </ActionLink>
        </nav>

        <section className="flex flex-col gap-3 py-8 text-center">
          <p className="text-xs text-[var(--color-ink-faint)] font-medium">Detail error</p>
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
