import { AnimalCreator } from "@/components/animals/animal-creator";
import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";

export default async function NewAnimalPage() {
  await getRequiredRoleGroupSession(["ADMIN", "STAFF"]);

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      {/* Back button */}
      <div className="mb-6">
        <a
          href="/dashboard/admin"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          ← Dashboard
        </a>
      </div>

      {/* Hero header */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 pt-8 mb-6 animate-fade-up">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Admin workspace</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
            Add a new animal
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Complete the fields below to add a new animal record to the shelter catalog.
          </p>
        </div>
      </section>

      <AnimalCreator />
    </div>
  );
}
