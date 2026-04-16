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
      <div className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Admin route</p>
          <h1 className="page-title">Adopter record unavailable</h1>
          <p className="page-copy">The protected adopter detail route could not be loaded.</p>
        </section>

        <nav className="breadcrumb">
          <ActionLink href="/dashboard/admin/adopters" variant="chip">
            ← Adopters
          </ActionLink>
        </nav>

        <section className="empty-state">
          <p className="eyebrow">Detail error</p>
          <h2 className="panel-title">We couldn&apos;t load this adopter record.</h2>
          <p className="panel-copy">{result.message}</p>
        </section>
      </div>
    );
  }

  return <AdminAdopterDetailClient adopter={result.adopter} onUpdate={() => {}} />;
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