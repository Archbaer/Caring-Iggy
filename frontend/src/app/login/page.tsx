import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/server-session";
import { resolveAuthenticatedRedirect } from "@/lib/auth/role-check";

type PageProps = {
  searchParams: Promise<{
    redirect?: string | string[];
  }>;
};

function readQueryValue(value?: string | string[]): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    getCurrentSession(),
    searchParams,
  ]);
  const requestedRedirect = readQueryValue(resolvedSearchParams.redirect);

  if (session) {
    redirect(resolveAuthenticatedRedirect(session, requestedRedirect));
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Public auth route</p>
        <h1 className="page-title" style={{ marginBottom: "var(--space-4)" }}>Welcome back to your adoption workspace.</h1>
        <p className="page-copy">
          Sign in with an existing account to continue browsing animals, return to
          your adopter dashboard, or resume administrator follow-up work.
        </p>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <p className="eyebrow">Accounts</p>
          <h2 className="panel-title">One login, role-aware destination.</h2>
          <ul className="detail-list">
            <li>Adopters return to the protected dashboard by default.</li>
            <li>Staff land back on the animal catalog for operational work.</li>
            <li>Admins are routed directly to adopter-management screens.</li>
          </ul>
        </article>

        <LoginForm />
      </section>
    </div>
  );
}
