"use client";

import { EmptyState } from "@/components/ui/empty-state";

export default function AnimalsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-[var(--max-width-content)] mx-auto px-4 sm:px-6 pt-20 pb-8">
      <EmptyState
        variant="error"
        eyebrow="Catalog error"
        title="The animal catalog is unavailable."
        body={error.message || "Please try again."}
        cta={{ href: "/", label: "Return home" }}
      />
      <div className="mt-4 text-center">
        <button type="button" onClick={reset} className="text-[var(--color-primary)] font-semibold text-sm underline-offset-4 hover:underline">
          Try again
        </button>
      </div>
    </div>
  );
}
