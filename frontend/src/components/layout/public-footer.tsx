import { ActionLink } from "@/components/ui/action-link";
import { getCurrentSession } from "@/lib/auth/server-session";
import { defaultRouteForRole } from "@/lib/auth/role-check";

const quickLinks = [
  { href: "/animals", label: "Browse Animals" },
  { href: "/login", label: "Sign In" },
  { href: "/signup", label: "Create Account" },
  { href: "/dashboard", label: "Dashboard" },
];

const contactInfo = {
  phone: "+1 (415) 555-0192",
  email: "hello@caringiggy.org",
  address: "742 Evergreen Terrace, San Francisco, CA 94102",
  hours: "Mon–Sat 9:00 AM – 6:00 PM",
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

  return (
    <footer className="shell-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <p className="footer-title">Caring Iggy</p>
          <p className="footer-tagline">
            Finding loving homes for animals in need since 2018.
          </p>
          <div className="footer-social">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="footer-social-link"
                aria-label={link.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        <nav className="footer-nav" aria-label="Quick links">
          <p className="footer-nav-title">Quick Access</p>
          <ul className="footer-nav-list">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <ActionLink href={link.href} variant="chip">
                  {link.label}
                </ActionLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-contact">
          <p className="footer-nav-title">Contact Us</p>
          <address className="footer-address">
            <p className="footer-contact-item">
              <span className="footer-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <a href={`tel:${contactInfo.phone.replace(/\D/g, "")}`}>{contactInfo.phone}</a>
            </p>
            <p className="footer-contact-item">
              <span className="footer-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
            </p>
            <p className="footer-contact-item">
              <span className="footer-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              {contactInfo.address}
            </p>
            <p className="footer-contact-item footer-hours">
              <span className="footer-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </span>
              {contactInfo.hours}
            </p>
          </address>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Caring Iggy Animal Shelter. All rights reserved.</p>
        {session ? (
          <ActionLink href={defaultRouteForRole(session.role)} variant="chip">
            {session.role === "ADMIN" ? "Admin workspace" : "Your workspace"}
          </ActionLink>
        ) : null}
      </div>
    </footer>
  );
}
