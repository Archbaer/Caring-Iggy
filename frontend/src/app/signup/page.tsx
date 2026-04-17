import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
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

export default async function SignupPage({ searchParams }: PageProps) {
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
        <h1 className="page-title" style={{ marginBottom: "var(--space-4)" }}>Start an adopter account with calm, clear next steps.</h1>
        <p className="page-copy">
          Public registration is reserved for adopters only. Staff and admin
          accounts stay in separate provisioned flows so this route remains a
          clean public boundary.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Public onboarding</p>
          <h2 className="panel-title">What happens after account creation.</h2>
          <ul className="detail-list">
            <li>Your account is created through the frontend BFF only.</li>
            <li>CSRF protection is refreshed from the session endpoint before submit.</li>
            <li>Successful signup continues into the same role-aware redirect flow as login.</li>
          </ul>
        </article>

        <SignupForm />
      </section>
    </div>
  );
}
