import { AnimalCreator } from "@/components/animals/animal-creator";
import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";

export default async function NewAnimalPage() {
  await getRequiredRoleGroupSession(["STAFF", "ADMIN"]);

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Staff workspace</p>
        <h1 className="page-title">Add a new animal.</h1>
        <p className="page-copy">
          Complete the fields below to add a new animal record to the shelter
          catalog.
        </p>
      </section>

      <AnimalCreator />
    </div>
  );
}
