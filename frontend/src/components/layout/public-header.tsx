import Link from "next/link";

import { ActionLink } from "@/components/ui/action-link";

const primaryLinks = [
  { href: "/animals", label: "Animals" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign up" },
  { href: "/dashboard", label: "Dashboard" },
];

export function PublicHeader() {
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
      </nav>
    </header>
  );
}
