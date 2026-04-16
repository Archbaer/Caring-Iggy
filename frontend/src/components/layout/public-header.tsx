import Link from "next/link";

import { LogoutButton } from "@/components/layout/logout-button";
import { getCurrentSession } from "@/lib/auth/server-session";
import { defaultRouteForRole } from "@/lib/auth/role-check";

export async function PublicHeader() {
  const session = await getCurrentSession();
  const dashboardLink = session ? defaultRouteForRole(session.role) : "/dashboard";

  return (
    <header className="ci-header">
      <div className="ci-header__inner">
        <Link href="/" className="ci-brand">
          Caring Iggy
        </Link>

        <nav className="ci-header__nav" aria-label="Primary">
          <Link href="/animals" className="ci-btn ci-btn--ghost ci-btn--sm">Animals</Link>
          <Link href="/about" className="ci-btn ci-btn--ghost ci-btn--sm">About</Link>
          <a href="#" className="ci-btn ci-btn--primary ci-btn--sm">Donate</a>

          {session ? (
            <>
              <Link href={dashboardLink} className="ci-btn ci-btn--ghost ci-btn--sm">Dashboard</Link>
              <span className="ci-badge ci-badge--muted">{session.role}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="ci-btn ci-btn--ghost ci-btn--sm">Login</Link>
              <Link href="/signup" className="ci-btn ci-btn--primary ci-btn--sm">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}