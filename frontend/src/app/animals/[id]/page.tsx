import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AnimalDetail } from "@/components/animals/animal-detail";
import { fetchAnimalForView } from "@/lib/api/animals";
import { getCurrentSession } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ id: string }>;
};

type AnimalDetailResult =
  | { kind: "success"; animal: Awaited<ReturnType<typeof fetchAnimalForView>> }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export const dynamic = "force-dynamic";

async function loadAnimal(id: string): Promise<AnimalDetailResult> {
  try {
    const animal = await fetchAnimalForView(id);

    return { kind: "success", animal };
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return { kind: "not-found" };
    }

    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "The animal profile is temporarily unavailable.",
    };
  }
}

export default async function AnimalDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [result, session] = await Promise.all([loadAnimal(id), getCurrentSession()]);

  if (result.kind === "not-found") {
    notFound();
  }

  if (result.kind === "error") {
    return (
      <div className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Public profile</p>
          <h1 className="page-title">Animal profile unavailable.</h1>
          <p className="page-copy">
            The public detail view could not be loaded right now.
          </p>
        </section>

        <section className="empty-state">
          <p className="eyebrow">Profile error</p>
          <h2 className="panel-title">This animal record could not be shown.</h2>
          <p className="panel-copy">{result.message}</p>
          <Link href="/animals" className="link-chip">
            Back to animals
          </Link>
        </section>
      </div>
    );
  }

  const canEditAnimal = session?.role === "STAFF" || session?.role === "ADMIN";
  const editorSlot = canEditAnimal
    ? await renderEditorSlot(
        result.animal,
        session.role === "ADMIN" ? "ADMIN" : "STAFF",
      )
    : undefined;

  return (
    <AnimalDetail
      animal={result.animal}
      editorSlot={editorSlot}
    />
  );
}

async function renderEditorSlot(
  animal: Awaited<ReturnType<typeof fetchAnimalForView>>,
  userRole: "STAFF" | "ADMIN",
): Promise<ReactNode> {
  const { AnimalEditorSlot } = await import(
    "@/components/animals/animal-editor-slot"
  );

  return <AnimalEditorSlot animal={animal} userRole={userRole} />;
}
