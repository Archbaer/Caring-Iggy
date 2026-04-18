import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";
import { fetchAdminAdopters } from "@/lib/api/admin";
import { fetchAnimals } from "@/lib/api/animals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await getRequiredRoleGroupSession(["ADMIN"]);

  const [adoptersResult, animalsResult] = await Promise.all([
    fetchAdminAdopters(),
    fetchAnimals(),
  ]);

  const adopterCount = adoptersResult.length;
  const animalCount = animalsResult.length;

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto px-6 py-8">
      <Eyebrow className="mb-2">Admin workspace</Eyebrow>
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium text-[var(--color-ink)] mb-8 tracking-[-0.02em] leading-[1.05]">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card variant="hero" className="p-8 flex flex-col gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">Total adopters</p>
            <p className="font-[family-name:var(--font-display)] text-7xl font-medium text-[var(--color-ink)] tracking-[-0.03em] leading-[1]">
              {adopterCount}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {adopterCount === 1
                ? "1 registered adopter account"
                : `${adopterCount} registered adopter accounts`}
            </p>
            <Button as="a" href="/dashboard/admin/adopters" variant="primary" size="md">
              View all adopters
            </Button>
          </div>
        </Card>

        <Card variant="hero" className="p-8 flex flex-col gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">Total animals</p>
            <p className="font-[family-name:var(--font-display)] text-7xl font-medium text-[var(--color-ink)] tracking-[-0.03em] leading-[1]">
              {animalCount}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {animalCount === 1
                ? "1 animal in the catalog"
                : `${animalCount} animals in the catalog`}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button as="a" href="/animals" variant="ghost" size="md">
                View catalog
              </Button>
              <Button as="a" href="/animals/new" variant="primary" size="md">
                Add animal
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
