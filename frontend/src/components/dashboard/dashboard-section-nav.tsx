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
    <nav className="flex flex-wrap gap-2" aria-label="Dashboard sections">
      {dashboardLinks.map((link) => (
        <ActionLink
          key={link.href}
          href={link.href}
          variant="chip"
          className={link.href === currentPath ? "is-active" : ""}
        >
          {link.label}
        </ActionLink>
      ))}
    </nav>
  );
}
