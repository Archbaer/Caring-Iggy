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

      <AnimalEditor animal={animal} userRole={userRole} />
    </div>
  );
}
