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
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
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
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-6 py-20 bg-[var(--color-canvas)]">
      {/* Page header */}
      <div className="w-full max-w-4xl mx-auto mb-10 text-center ci-hero-reveal">
        <p className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
          Public auth route
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-4">
          Welcome back to your adoption workspace.
        </h1>
        <p className="text-[var(--color-ink-soft)] leading-relaxed max-w-[55ch] mx-auto">
          Sign in with an existing account to continue browsing animals, return to your adopter dashboard, or resume administrator follow-up work.
        </p>
      </div>

      {/* Content grid */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Info panel */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
          <p className="mb-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">
            Accounts
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] mb-5">
            One login, role-aware destination.
          </h2>
          <ul className="space-y-3">
            {[
              "Adopters return to the protected dashboard by default.",
              "Staff return to the shared dashboard workspace by default.",
              "Admins are routed directly to adopter-management screens.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[var(--color-ink-soft)]">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Login form */}
        <LoginForm />
      </div>
    </div>
  );
}
