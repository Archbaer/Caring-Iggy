import Link from "next/link";

import { LogoutButton } from "@/components/layout/logout-button";
import { getCurrentSession } from "@/lib/auth/server-session";
import { defaultRouteForRole } from "@/lib/auth/role-check";
import { Badge } from "@/components/ui/badge";
import { HeaderNav } from "./header-nav";

export async function PublicHeader() {
  const session = await getCurrentSession();
  const dashboardLink = session ? defaultRouteForRole(session.role) : "/dashboard";

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--color-surface-deep)] shadow-lg h-16">
      <div className="w-full max-w-[var(--max-width-wide)] mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-2xl font-extrabold text-white tracking-tight flex-shrink-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          🐾 Caring Iggy
        </Link>

        {/* Nav — client component handles active state */}
        <nav className="hidden sm:flex items-center gap-2" aria-label="Primary">
          <Link
            href="/animals"
            className="px-4 py-2 rounded-full text-sm font-bold text-[var(--color-ink-on-dark)] border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-200"
          >
            Animals
          </Link>
          <Link
            href="/about"
            className="px-4 py-2 rounded-full text-sm font-bold text-[var(--color-ink-on-dark)] border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-200"
          >
            About
          </Link>
          <Link
            href="/donate"
            className="px-5 py-2 rounded-full text-sm font-bold bg-[var(--color-accent)] text-white shadow-[var(--shadow-coral)] hover:bg-[var(--color-accent-deep)] hover:scale-105 active:scale-95 transition-all duration-200"
          >
            ❤️ Donate
          </Link>

          <div className="w-px h-5 bg-white/20 mx-1" />

          {session ? (
            <>
              <HeaderNav dashboardLink={dashboardLink} />
              <Badge variant="muted">
                {session.role}
              </Badge>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-full text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all duration-200"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-full text-sm font-bold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-deep)] transition-all duration-200"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu hint */}
        {/* TODO: implement mobile menu toggle */}
        <button type="button"
          disabled
          aria-disabled="true"
          aria-label="Open menu"
          className="sm:hidden p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors duration-200"
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
