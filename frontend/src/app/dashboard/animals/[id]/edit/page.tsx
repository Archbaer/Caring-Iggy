import { AnimalEditor } from "@/components/animals/animal-editor";
import { fetchAnimalForView } from "@/lib/api/animals";
import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AnimalEditPage({ params }: Props) {
  const { id } = await params;

  const session = await getRequiredRoleGroupSession(["ADMIN", "STAFF"]);
  const userRole = session.role === "ADMIN" ? "ADMIN" : "STAFF";

  let animal;
  try {
    animal = await fetchAnimalForView(id);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      notFound();
    }
    throw error;
  }

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
            Edit animal record
          </h1>

          <AnimalEditor animal={animal} userRole={userRole} />
        </div>

        {/* Right: sidebar */}
        <aside className="bg-[var(--color-primary-pale)] rounded-3xl p-6 border border-[var(--color-border)] self-start sticky top-24">
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-4">Tips</h2>
          <ul className="space-y-3 text-sm text-[var(--color-ink-soft)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--color-accent)] mt-0.5">•</span>
              Review changes before saving
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--color-accent)] mt-0.5">•</span>
              Status changes are immediate
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
