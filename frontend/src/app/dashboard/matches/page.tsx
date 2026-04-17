import { redirect } from "next/navigation";

import { PublicFooter } from "@/components/layout/public-footer";
import { LOGIN_ROUTE } from "@/lib/auth/role-check";
import { getCurrentSession } from "@/lib/auth/server-session";

export default async function DashboardMatchesPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect(`${LOGIN_ROUTE}?redirect=/dashboard/matches`);
  }

  return (
    <>
      <div className="page-shell">
        <section
          className="panel"
          style={{ maxWidth: "var(--max-width-content)", margin: "0 auto", textAlign: "center" }}
        >
          <p className="eyebrow">Coming soon</p>
          <h1 className="ci-h2" style={{ marginBottom: "var(--space-4)" }}>Matching is coming.</h1>
          <p
            className="ci-body-lg"
            style={{
              color: "var(--color-ink-soft)",
              marginBottom: "var(--space-5)",
              maxWidth: "64ch",
              marginInline: "auto",
            }}
          >
            Our matching feature is being built with care. When it arrives, you&apos;ll be able to
            see animal-adopter matches curated by our staff.
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}>
            <a href="/dashboard" className="ci-btn ci-btn--primary">Back to dashboard</a>
            <a href="/animals" className="ci-btn ci-btn--ghost">Browse animals</a>
          </div>
        </section>
      </div>

      <PublicFooter />
    </>
  );
}
