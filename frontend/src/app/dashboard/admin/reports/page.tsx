import { Eyebrow } from "@/components/ui/eyebrow";
import { ReportsClient } from "@/components/admin/reports-client";
import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await getRequiredRoleGroupSession(["ADMIN"]);

  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-8 bg-canvas-pattern">
      <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] p-8 border border-[var(--color-border)] mb-8">
        <div className="flex flex-col gap-2">
          <Eyebrow className="text-[var(--color-accent)]">Administration</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--color-ink)] mb-2">
            Reports
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Monthly intake and adoption data for the shelter
          </p>
        </div>
      </section>

      <ReportsClient />
    </div>
  );
}
