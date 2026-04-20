import { Users, Briefcase, PawPrint } from "lucide-react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { StatCard } from "@/components/ui/stat-card";
import {
  fetchAdminAdopters,
  fetchAdminEmployees,
} from "@/lib/api/admin";
import { fetchAnimals } from "@/lib/api/animals";
import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await getRequiredRoleGroupSession(["ADMIN"]);

  const [adoptersResult, employeesResult, animalsResult] = await Promise.all([
    fetchAdminAdopters(),
    fetchAdminEmployees(),
    fetchAnimals(),
  ]);

  const adopterCount = adoptersResult.length;
  const staffCount = employeesResult.length;
  const animalCount = animalsResult.length;

  return (
    <div className="ci-admin-canvas">
      {/* Page header — contained in card */}
      <div className="ci-admin-page-header animate-fade-up">
        <Eyebrow className="mb-3">Admin workspace</Eyebrow>
        <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl font-medium text-[var(--color-ink)] mb-2 tracking-[-0.02em] leading-[1.05]">
          Dashboard
        </h1>
        <p className="text-[var(--color-ink-soft)]">
          Manage your shelter&apos;s adopters, staff, and animals
        </p>
      </div>

      {/* Stat cards */}
      <div className="ci-stat-card-grid">
        {/* Adopters card — terracotta tint */}
        <div style={{ backgroundColor: "var(--color-accent-pale)" }}>
          <StatCard
            icon={<Users className="h-5 w-5" />}
            iconBg="bg-[var(--color-accent-pale)]"
            iconColor="text-[var(--color-accent)]"
            eyebrow="People"
            value={adopterCount}
            singular="Registered adopter"
            plural="Registered adopters"
            subtext={
              adopterCount === 0
                ? "No adopter accounts yet"
                : `${adopterCount} adopter${adopterCount === 1 ? "" : "s"} in the system`
            }
            href="/dashboard/admin/adopters"
            hint="View all →"
          />
        </div>

        {/* Staff card — sage tint */}
        <div style={{ backgroundColor: "var(--color-primary-pale)" }}>
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            iconBg="bg-[var(--color-primary-pale)]"
            iconColor="text-[var(--color-primary)]"
            eyebrow="Team"
            value={staffCount}
            singular="Staff member"
            plural="Staff members"
            subtext={
              staffCount === 0
                ? "No staff accounts yet"
                : `${staffCount} team member${staffCount === 1 ? "" : "s"} on staff`
            }
            href="/dashboard/admin/staff"
            hint="View all →"
          />
        </div>

        {/* Animals card — amber tint + two actions */}
        <div style={{ backgroundColor: "var(--color-warning-bg)" }}>
          <StatCard
            icon={<PawPrint className="h-5 w-5" />}
            iconBg="bg-[var(--color-warning-bg)]"
            iconColor="text-[var(--color-warning)]"
            eyebrow="Animals"
            value={animalCount}
            singular="Animal in catalog"
            plural="Animals in catalog"
            subtext={
              animalCount === 0
                ? "No animals in the catalog yet"
                : `${animalCount} animal${animalCount === 1 ? "" : "s"} across all statuses`
            }
            href="/animals"
            hint="View catalog →"
            twoActions={{ label: "View catalog", href: "/animals" }}
          />
        </div>
      </div>
    </div>
  );
}
