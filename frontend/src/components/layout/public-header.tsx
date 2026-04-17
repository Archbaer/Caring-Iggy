import Link from "next/link";

import { LogoutButton } from "@/components/layout/logout-button";
import { getCurrentSession } from "@/lib/auth/server-session";
import { defaultRouteForRole } from "@/lib/auth/role-check";

export async function PublicHeader() {
  const session = await getCurrentSession();
  const dashboardLink = session ? defaultRouteForRole(session.role) : "/dashboard";

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[var(--color-canvas)]/90 border-b border-[var(--color-border)]">
      <div className="w-full max-w-[var(--max-width-wide)] mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Brand */}
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors duration-200 tracking-[-0.02em] flex-shrink-0"
        >
          Caring Iggy
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-2" aria-label="Primary">
          <Link
            href="/animals"
            className="px-4 py-2 rounded-full text-sm font-medium text-[var(--color-ink-soft)] border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-all duration-200"
          >
            Animals
          </Link>
          <Link
            href="/about"
            className="px-4 py-2 rounded-full text-sm font-medium text-[var(--color-ink-soft)] border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-all duration-200"
          >
            About
          </Link>
          <Link
            href="/donate"
            className="px-4 py-2 rounded-full text-sm font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-deep)] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all duration-200"
          >
            Donate
          </Link>

          <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

          {session ? (
            <>
              <Link
                href={dashboardLink}
                className="px-4 py-2 rounded-full text-sm font-medium text-[var(--color-ink-soft)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-all duration-200"
              >
                Dashboard
              </Link>
              <span className="ci-badge ci-badge--muted text-xs">
                {session.role}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-full text-sm font-medium text-[var(--color-ink-soft)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-all duration-200"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-full text-sm font-semibold bg-[var(--color-ink)] text-[var(--color-canvas)] hover:bg-[var(--color-primary)] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all duration-200"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu hint — simplified for now */}
        <button
          aria-label="Open menu"
          className="sm:hidden p-2 rounded-lg text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors duration-200"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
}
