import type { AnimalSummaryView } from "@/lib/api/animals";
import { toInterestStatusSummary } from "@/lib/constants/status-map";

type InterestStatusListProps = {
  animals: AnimalSummaryView[];
  emptyTitle: string;
  emptyCopy: string;
  onRemove?: (animalId: string) => void;
  pendingAnimalId?: string | null;
};

export function InterestStatusList({
  animals,
  emptyTitle,
  emptyCopy,
  onRemove,
  pendingAnimalId,
}: InterestStatusListProps) {
  if (animals.length === 0) {
    return (
      <div className="flex flex-col gap-2 py-4 text-center">
        <h3 className="text-base font-medium text-[var(--color-ink)]">{emptyTitle}</h3>
        <p className="text-sm text-[var(--color-ink-soft)]">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {animals.map((animal) => (
        <li key={animal.id} className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-[var(--color-ink)]">{animal.name}</h3>
              <p className="text-sm text-[var(--color-ink-soft)]">
                {animal.breed} · {animal.animalType}
              </p>
            </div>
            <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--color-surface-warm)] text-[var(--color-ink-faint)] px-2.5 py-1 text-xs font-medium min-w-[7rem] flex-shrink-0">{animal.statusLabel}</span>
            {onRemove ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                disabled={pendingAnimalId === animal.id}
                onClick={() => {
                  onRemove(animal.id);
                }}
              >
                {pendingAnimalId === animal.id ? "Saving..." : "Remove"}
              </button>
            ) : null}
          </div>
          <p className="text-sm text-[var(--color-ink-soft)]">{toInterestStatusSummary(animal.status)}</p>
        </li>
      ))}
    </ul>
  );
}
