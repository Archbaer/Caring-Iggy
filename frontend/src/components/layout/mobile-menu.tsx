"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MobileMenuProps = {
  session: { role: string; name?: string } | null;
  dashboardLink: string;
};

export function MobileMenu({ session, dashboardLink }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Auto-close on route change (defer setState to avoid sync setState in effect)
  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Focus management: focus first link on open, return to toggle on close
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        firstLinkRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      toggleRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      {/* Toggle button */}
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        aria-label={open ? "Close menu" : "Open menu"}
        className="sm:hidden p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors duration-200"
      >
        {open ? (
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-[var(--color-ink)]/40 sm:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-[var(--color-surface-deep)] text-[var(--color-ink-on-dark)] shadow-2xl transform transition-transform duration-300 ease-in-out sm:hidden ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-col h-full pt-20 px-6 pb-8">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Nav items — mirror desktop */}
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            <Link
              ref={firstLinkRef}
              href="/animals"
              className="px-4 py-3 rounded-2xl text-base font-bold hover:bg-white/10 transition-colors"
            >
              Animals
            </Link>
            <Link
              href="/about"
              className="px-4 py-3 rounded-2xl text-base font-bold hover:bg-white/10 transition-colors"
            >
              About
            </Link>
            <Link
              href="/donate"
              className="px-4 py-3 rounded-2xl text-base font-bold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-deep)] transition-colors mt-1"
            >
              Donate
            </Link>

            <div className="border-t border-white/10 my-3" />

            {session ? (
              <>
                <Link
                  href={dashboardLink}
                  className="px-4 py-3 rounded-2xl text-base font-bold hover:bg-white/10 transition-colors"
                >
                  Dashboard
                </Link>
                <div className="px-4 py-2 text-xs font-bold text-[var(--color-ink-faint)] uppercase tracking-wider">
                  {session.role}
                </div>
                <Link
                  href="/api/auth/logout"
                  className="px-4 py-3 rounded-2xl text-base text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Log out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-3 rounded-2xl text-base font-bold text-white border border-white/20 hover:bg-white/10 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-3 rounded-2xl text-base font-bold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-deep)] transition-colors mt-1"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
