"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type HeaderNavProps = {
  dashboardLink: string;
};

export function HeaderNav({ dashboardLink }: HeaderNavProps) {
  const pathname = usePathname();
  const isOnDashboard = pathname.startsWith("/dashboard");

  return (
    <Link
      href={dashboardLink}
      className={[
        "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200",
        isOnDashboard
          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]"
          : "border-[var(--color-border)] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]",
      ].join(" ")}
    >
      Dashboard
    </Link>
  );
}
