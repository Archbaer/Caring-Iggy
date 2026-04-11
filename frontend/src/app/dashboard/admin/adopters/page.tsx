import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import {
  fetchAdminAdopters,
  type AdminAdopterSummary,
} from "@/lib/api/admin";
import { getRequiredRoleSession } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

type AdminAdopterResult =
  | { kind: "success"; adopters: AdminAdopterSummary[] }
  | { kind: "error"; message: string };

export default async function AdminAdoptersPage() {
  await getRequiredRoleSession("ADMIN");
  const result = await loadAdminAdopters();

  if (result.kind === "error") {
    return (
      <div className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Admin route</p>
          <h1 className="page-title">Adopter management</h1>
          <p className="page-copy">
            Administrator-only adopter oversight is protected, but the directory could not be loaded right now.
          </p>
        </section>

        <section className="empty-state">
          <p className="eyebrow">Directory error</p>
          <h2 className="panel-title">We couldn&apos;t load adopter records.</h2>
          <p className="panel-copy">{result.message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">Adopter management</h1>
        <p className="page-copy">
          Administrator-only adopter oversight stays on dedicated admin routes. These records come from the adopter service at request time; no placeholder data is rendered.
        </p>
      </section>

      {result.adopters.length > 0 ? (
        <section className="route-grid">
          {result.adopters.map((adopter) => (
            <Card key={adopter.id} variant="route">
              <span className="status-badge">{adopter.status}</span>
              <h2 className="route-card-title">{adopter.name}</h2>
              <p className="route-card-copy">
                {adopter.email} · {adopter.telephone}
              </p>
              <p className="route-card-copy">
                Interested animals saved: {adopter.interestCount}
              </p>
              <div className="route-actions">
                <ActionLink href={`/dashboard/admin/adopters/${adopter.id}`} variant="chip">
                  Open record
                </ActionLink>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <p className="eyebrow">No adopter records</p>
          <h2 className="panel-title">No adopter profiles are available.</h2>
          <p className="panel-copy">
            The admin route is live and protected, but adopter-service did not return any records.
          </p>
        </section>
      )}
    </div>
  );
}

async function loadAdminAdopters(): Promise<AdminAdopterResult> {
  try {
    return {
      kind: "success",
      adopters: await fetchAdminAdopters(),
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "The adopter directory is temporarily unavailable.",
    };
  }
}
