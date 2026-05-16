import { AnimalCreator } from "@/components/animals/animal-creator";
import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";

export default async function NewAnimalPage() {
  await getRequiredRoleGroupSession(["ADMIN", "STAFF"]);

  return (
    <div className="max-w-[80rem] mx-auto px-6 py-8 bg-canvas-pattern">
      <div className="lg:grid lg:grid-cols-[1fr_300px] gap-8">
        {/* Left: form */}
        <div>
          {/* Back link */}
          <a
            href="/dashboard/admin"
            className="text-[var(--color-accent)] font-semibold text-sm hover:underline mb-6 inline-flex items-center gap-1"
          >
            ← Dashboard
          </a>

          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mb-6">
            Add a new animal
          </h1>

          <AnimalCreator />
        </div>

        {/* Right: sidebar */}
        <aside className="bg-[var(--color-primary-pale)] rounded-3xl p-6 border border-[var(--color-border)] self-start sticky top-24">
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-4">Tips</h2>
          <ul className="space-y-3 text-sm text-[var(--color-ink-soft)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--color-accent)] mt-0.5">•</span>
              Fill in all required fields
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--color-accent)] mt-0.5">•</span>
              Upload a clear photo
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--color-accent)] mt-0.5">•</span>
              Write a detailed description
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
