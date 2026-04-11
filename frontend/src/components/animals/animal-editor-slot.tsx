"use client";

import dynamic from "next/dynamic";

import type { AnimalDetailView } from "@/lib/api/animals";

const LazyAnimalEditor = dynamic(
  () =>
    import("@/components/animals/animal-editor").then((module) => ({
      default: module.AnimalEditor,
    })),
  {
    ssr: false,
    loading: () => <p className="panel-copy">Loading staff editor tools…</p>,
  },
);

type AnimalEditorSlotProps = {
  animal: AnimalDetailView;
  userRole: "STAFF" | "ADMIN";
};

export function AnimalEditorSlot({ animal, userRole }: AnimalEditorSlotProps) {
  return <LazyAnimalEditor animal={animal} userRole={userRole} />;
}
