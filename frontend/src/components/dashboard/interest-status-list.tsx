import { Badge } from "@/components/ui/badge";
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
        <h3 className="text-base font-semibold text-[var(--color-ink)]">{emptyTitle}</h3>
        <p className="text-sm text-[var(--color-ink-soft)]">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {animals.map((animal) => (
        <li key={animal.id} className="rounded-2xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[var(--color-primary)] hover:underline">
                <a href={`/animals/${animal.id}`}>{animal.name}</a>
              </h3>
              <p className="text-sm text-[var(--color-ink-soft)]">
                {animal.breed} · {animal.animalType}
              </p>
            </div>
            <Badge variant={animal.status === "AVAILABLE" ? "available" : animal.status === "PENDING" ? "pending" : "muted"} className="min-w-[7rem] flex-shrink-0">
              {animal.statusLabel}
            </Badge>
            {onRemove ? (
              <button
                type="button"
                className="text-[var(--color-danger)] text-sm font-semibold hover:underline"
                disabled={pendingAnimalId === animal.id}
                onClick={() => {
                  onRemove(animal.id);
                }}
              >
                {pendingAnimalId === animal.id ? "Saving..." : "Remove"}
              </button>
            ) : null}
          </div>
          <p className="text-xs text-[var(--color-ink-faint)] mt-2">{toInterestStatusSummary(animal.status)}</p>
        </li>
      ))}
    </ul>
  );
}
