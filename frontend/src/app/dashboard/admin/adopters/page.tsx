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
          <p className="eyebrow">Adopter records</p>
          <h1 className="page-title">Adopter management</h1>
          <p className="page-copy">
            The adopter directory could not be loaded right now. Please try again in a moment.
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
        <p className="eyebrow">Adopter records</p>
        <h1 className="page-title">Adopter management</h1>
        <p className="page-copy">
          View and manage adopter profiles, track adoption history, and monitor interested animals across all accounts.
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
          <h2 className="panel-title">No adopter profiles yet.</h2>
          <p className="panel-copy">
            Adopter accounts will appear here once registered.
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
