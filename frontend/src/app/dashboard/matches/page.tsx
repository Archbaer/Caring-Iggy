import { redirect } from "next/navigation";

import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { LOGIN_ROUTE } from "@/lib/auth/role-check";
import { getCurrentSession } from "@/lib/auth/server-session";

export default async function DashboardMatchesPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect(`${LOGIN_ROUTE}?redirect=/dashboard/matches`);
  }

  return (
    <div className="page-shell">
      <Card as="section" variant="hero">
        <p className="eyebrow">Protected route</p>
        <h1 className="page-title">Matching is not enabled in this release.</h1>
        <p className="page-copy">
          Your dashboard access remains protected, but live match generation stays
          off until the matching experience is ready for a dependable rollout.
        </p>
      </Card>

      <Card as="section">
        <p className="eyebrow">Coming soon</p>
        <h2 className="panel-title">This page intentionally shows no live results.</h2>
        <p className="panel-copy">
          We are keeping `/dashboard/matches` visible now so the protected route map
          stays stable, without calling matching APIs, showing placeholder match
          cards, or implying approvals that do not exist yet.
        </p>
        <div className="footer-actions">
          <ActionLink href="/dashboard" variant="secondary">
            Return to dashboard
          </ActionLink>
          <ActionLink href="/animals" variant="chip">
            Browse available animals
          </ActionLink>
        </div>
      </Card>
    </div>
  );
}
