import Link from "next/link";

import { ActionLink } from "@/components/ui/action-link";
import { LogoutButton } from "@/components/layout/logout-button";
import { getCurrentSession } from "@/lib/auth/server-session";
import { defaultRouteForRole } from "@/lib/auth/role-check";

const publicLinks = [
  { href: "/animals", label: "Animals" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign up" },
];

export async function PublicHeader() {
  const session = await getCurrentSession();
  const primaryLinks = session
    ? buildAuthenticatedLinks(session.role)
    : publicLinks;

  return (
    <header className="shell-header">
      <div className="shell-brand-block">
        <p className="eyebrow">Caring Iggy</p>
        <Link href="/" className="brand-mark brand-link">
          Calm adoption journeys for people and animals.
        </Link>
      </div>

      <nav aria-label="Primary" className="shell-nav">
        {primaryLinks.map((link) => (
          <ActionLink key={link.href} href={link.href} variant="chip">
            {link.label}
          </ActionLink>
        ))}

        {session ? (
          <>
            <span className="status-badge shell-role-badge">{session.role}</span>
            <LogoutButton />
          </>
        ) : null}
      </nav>
    </header>
  );
}

function buildAuthenticatedLinks(role: "ADOPTER" | "STAFF" | "ADMIN") {
  if (role === "ADMIN") {
    return [
      { href: "/animals", label: "Animals" },
      { href: "/dashboard/admin/adopters", label: "Adopters" },
      { href: "/dashboard/admin/staff", label: "Staff" },
    ];
  }

  if (role === "STAFF") {
    return [{ href: "/animals", label: "Animals" }];
  }

  return [
    { href: "/animals", label: "Animals" },
    { href: defaultRouteForRole(role), label: "Dashboard" },
  ];
}
