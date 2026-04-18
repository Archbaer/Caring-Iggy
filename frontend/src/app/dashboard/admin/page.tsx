import { Users, Briefcase, PawPrint } from "lucide-react";

import { ActionLink } from "@/components/ui/action-link";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <Eyebrow className="mb-3">Admin workspace</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl font-medium text-gray-900 mb-2 tracking-[-0.02em] leading-[1.05]">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your shelter&apos;s adopters, staff, and animals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Adopters */}
          <Card className="hover:shadow-lg transition-shadow p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <Eyebrow>People</Eyebrow>
              </div>
            </div>

            <div className="text-center py-2">
              <div className="font-[family-name:var(--font-display)] text-7xl font-bold text-gray-900 tracking-[-0.04em] leading-[0.9]">
                {adopterCount}
              </div>
              <p className="mt-2 text-base font-medium text-gray-700">
                {adopterCount === 1 ? "Registered adopter" : "Registered adopters"}
              </p>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                {adopterCount === 0
                  ? "No adopter accounts yet"
                  : `${adopterCount} adopter${adopterCount === 1 ? "" : "s"} in the system`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ActionLink href="/dashboard/admin/adopters" variant="chip">
                View adopters
              </ActionLink>
              <ActionLink href="/dashboard/admin/staff" variant="chip">
                Manage staff
              </ActionLink>
            </div>
          </Card>

          {/* Staff */}
          <Card className="hover:shadow-lg transition-shadow p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <Eyebrow>Team</Eyebrow>
              </div>
            </div>

            <div className="text-center py-2">
              <div className="font-[family-name:var(--font-display)] text-7xl font-bold text-gray-900 tracking-[-0.04em] leading-[0.9]">
                {staffCount}
              </div>
              <p className="mt-2 text-base font-medium text-gray-700">
                {staffCount === 1 ? "Staff member" : "Staff members"}
              </p>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                {staffCount === 0
                  ? "No staff accounts yet"
                  : `${staffCount} team member${staffCount === 1 ? "" : "s"} on staff`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ActionLink href="/dashboard/admin/staff" variant="chip">
                View staff
              </ActionLink>
              <ActionLink href="/dashboard/admin/staff" variant="chip">
                Manage roles
              </ActionLink>
            </div>
          </Card>

          {/* Animals */}
          <Card className="hover:shadow-lg transition-shadow p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <PawPrint className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <Eyebrow>Animals</Eyebrow>
              </div>
            </div>

            <div className="text-center py-2">
              <div className="font-[family-name:var(--font-display)] text-7xl font-bold text-gray-900 tracking-[-0.04em] leading-[0.9]">
                {animalCount}
              </div>
              <p className="mt-2 text-base font-medium text-gray-700">
                {animalCount === 1 ? "Animal in catalog" : "Animals in catalog"}
              </p>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                {animalCount === 0
                  ? "No animals in the catalog yet"
                  : `${animalCount} animal${animalCount === 1 ? "" : "s"} across all statuses`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ActionLink href="/animals" variant="chip">
                View catalog
              </ActionLink>
              <ActionLink href="/dashboard/admin/animals/new" variant="chip">
                Add animal
              </ActionLink>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
