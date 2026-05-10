import { ActionLink } from "@/components/ui/action-link";

const dashboardLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/preferences", label: "Preferences" },
  { href: "/dashboard/interests", label: "Interests" },
  { href: "/dashboard/matches", label: "Matches" },
] as const;

type DashboardSectionNavProps = {
  currentPath: string;
};

export function DashboardSectionNav({ currentPath }: DashboardSectionNavProps) {
  return (
    <nav className="flex flex-wrap gap-2 my-6" aria-label="Dashboard sections">
      {dashboardLinks.map((link) => (
        <ActionLink
          key={link.href}
          href={link.href}
          variant="chip"
          size="lg"
          className={link.href === currentPath
            ? "bg-[var(--color-primary)] text-white rounded-full px-4 py-2 text-sm font-bold"
            : "bg-white border border-[var(--color-border)] text-[var(--color-ink-soft)] rounded-full px-4 py-2 text-sm font-medium hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all duration-200"
          }
        >
          {link.label}
        </ActionLink>
      ))}
    </nav>
  );
}
