import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/server-session";
import { defaultRouteForRole } from "@/lib/auth/role-check";

const quickLinks = [
  { href: "/animals", label: "Browse Animals" },
  { href: "/about", label: "About Us" },
  { href: "/donate", label: "Donate" },
  { href: "#", label: "Volunteer (coming soon)" },
  { href: "/login", label: "Sign In" },
  { href: "/signup", label: "Create Account" },
];

const adoptLinks = [
  { href: "/animals?status=AVAILABLE", label: "Available Animals" },
  { href: "/dashboard/preferences", label: "My Preferences" },
  { href: "/dashboard/interests", label: "My Interests" },
  { href: "/dashboard/matches", label: "My Matches" },
];

const contactInfo = {
  phone: "+1 (415) 555-0192",
  email: "hello@caringiggy.org",
  address: "742 Evergreen Terrace, San Francisco, CA 94102",
  hours: "Mon–Sat 9AM–6PM",
};

const socialLinks = [
  {
    label: "Instagram",
    href: "https://instagram.com/caringiggy",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://facebook.com/caringiggy",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:hello@caringiggy.org",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
];

export async function PublicFooter() {
  const session = await getCurrentSession();
  const dashboardLink = session ? defaultRouteForRole(session.role) : "/dashboard";

  return (
    <footer className="bg-[var(--color-surface-deep)]">
      <div className="max-w-[var(--max-width-content)] mx-auto px-6 pt-16 pb-10">
        {/* Top section: 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10 text-center sm:text-left">
          {/* Brand + Social */}
          <div className="space-y-4">
            <p className="text-xl font-extrabold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              <span aria-hidden="true">🐾</span> Caring Iggy
            </p>
            <p className="text-sm text-[var(--color-ink-faint)] leading-relaxed max-w-[28ch] mx-auto sm:mx-0">
              Finding loving homes for animals in need since 2018.
            </p>
            <div className="flex gap-2 justify-center sm:justify-start">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2"
                  aria-label={link.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
              Quick Links
            </p>
            <ul className="space-y-2.5">
              {quickLinks.map((link, i) => (
                <li key={`quick-${i}`}>
                  {link.href.startsWith("/") ? (
                    <Link href={link.href} className="text-sm text-[var(--color-ink-faint)] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-sm text-[var(--color-ink-faint)] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Adopt */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
              Adopt
            </p>
            <ul className="space-y-2.5">
              {adoptLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[var(--color-ink-faint)] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
              Contact
            </p>
            <ul className="space-y-2.5 text-sm text-[var(--color-ink-faint)]">
              <li>
                <a href={`mailto:${contactInfo.email}`} className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2">
                  {contactInfo.email}
                </a>
              </li>
              <li>
                <a href={`tel:${contactInfo.phone.replace(/\D/g, "")}`} className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2">
                  {contactInfo.phone}
                </a>
              </li>
              <li>{contactInfo.hours}</li>
              <li className="mt-2 leading-snug">
                742 Evergreen Terrace<br />
                San Francisco, CA 94102
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-ink-faint)]">
            &copy; {new Date().getFullYear()} Caring Iggy Animal Shelter. All rights reserved.
          </p>
          {session && (
            <Link
              href={dashboardLink}
              className="text-sm text-[var(--color-ink-faint)] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2"
            >
              {session.role === "ADMIN" ? "Admin workspace" : "Your workspace"}
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
