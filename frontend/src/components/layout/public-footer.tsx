import { getCurrentSession } from "@/lib/auth/server-session";
import { defaultRouteForRole } from "@/lib/auth/role-check";

const quickLinks = [
  { href: "/animals", label: "Browse Animals" },
  { href: "/about", label: "About Us" },
  { href: "#", label: "Donate" },
  { href: "#", label: "Volunteer" },
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
    <footer className="ci-footer">
      <div className="ci-footer__top">
        <div>
          <p className="ci-footer__brand-name">Caring Iggy</p>
          <p className="ci-footer__tagline">Finding loving homes for animals in need since 2018.</p>
          <div className="ci-footer__social">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="ci-footer__social-link"
                aria-label={link.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="ci-footer__nav-title">Quick Links</p>
          <ul className="ci-footer__nav-list">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="ci-footer__nav-title">Adopt</p>
          <ul className="ci-footer__nav-list">
            {adoptLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="ci-footer__nav-title">Contact</p>
          <ul className="ci-footer__nav-list" style={{ fontStyle: "normal" }}>
            <li><a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></li>
            <li><a href={`tel:${contactInfo.phone.replace(/\D/g, "")}`}>{contactInfo.phone}</a></li>
            <li style={{ color: "var(--color-ink-soft)", fontSize: "0.9375rem" }}>{contactInfo.hours}</li>
            <li style={{ color: "var(--color-ink-soft)", fontSize: "0.9375rem", marginTop: "var(--space-2)" }}>
              742 Evergreen Terrace<br />
              San Francisco, CA 94102
            </li>
          </ul>
        </div>
      </div>

      <div className="ci-footer__bottom">
        <p className="ci-footer__copyright">
          &copy; {new Date().getFullYear()} Caring Iggy Animal Shelter. All rights reserved.
        </p>
        {session && (
          <a href={dashboardLink} className="ci-btn ci-btn--subtle ci-btn--sm">
            {session.role === "ADMIN" ? "Admin workspace" : "Your workspace"}
          </a>
        )}
      </div>
    </footer>
  );
}