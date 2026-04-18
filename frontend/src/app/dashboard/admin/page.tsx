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
      {/* Page header */}
      <div className="ci-admin-header animate-fade-up">
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
        {/* Adopters card — terracotta */}
        <StatCard
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-[var(--color-admin-terra-circle)]"
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
          links={[
            { label: "View adopters", href: "/dashboard/admin/adopters" },
            { label: "Manage staff", href: "/dashboard/admin/staff" },
          ]}
        />

        {/* Staff card — sage */}
        <StatCard
          icon={<Briefcase className="h-5 w-5" />}
          iconBg="bg-[var(--color-admin-sage-circle)]"
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
          links={[
            { label: "View staff", href: "/dashboard/admin/staff" },
            { label: "Manage roles", href: "/dashboard/admin/staff" },
          ]}
        />

        {/* Animals card — amber */}
        <StatCard
          icon={<PawPrint className="h-5 w-5" />}
          iconBg="bg-[var(--color-admin-amber-circle)]"
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
          links={[
            { label: "View catalog", href: "/animals" },
            { label: "Add animal", href: "/dashboard/admin/animals/new" },
          ]}
        />
      </div>
    </div>
  );
}
