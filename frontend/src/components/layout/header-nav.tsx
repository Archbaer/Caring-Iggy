"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type HeaderNavProps = {
  dashboardLink: string;
};

export function HeaderNav({ dashboardLink }: HeaderNavProps) {
  const pathname = usePathname();
  const isOnDashboard = pathname?.startsWith("/dashboard") ?? false;

  return (
    <Link
      href={dashboardLink}
      className={[
        "px-3 py-1.5 rounded-full text-sm font-bold border transition-all duration-200",
        isOnDashboard
          ? "border-white/40 bg-white/10 text-white"
          : "border-white/20 text-[var(--color-ink-on-dark)] hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      Dashboard
    </Link>
  );
}
