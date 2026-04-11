import type { AnimalSummaryView } from "@/lib/api/animals";
import { toInterestStatusSummary } from "@/lib/constants/status-map";

type InterestStatusListProps = {
  animals: AnimalSummaryView[];
  emptyTitle: string;
  emptyCopy: string;
};

export function InterestStatusList({
  animals,
  emptyTitle,
  emptyCopy,
}: InterestStatusListProps) {
  if (animals.length === 0) {
    return (
      <div className="dashboard-empty-copy">
        <h3 className="dashboard-subtitle">{emptyTitle}</h3>
        <p className="panel-copy">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <ul className="dashboard-interest-list">
      {animals.map((animal) => (
        <li key={animal.id} className="dashboard-interest-item">
          <div className="dashboard-interest-head">
            <div>
              <h3 className="dashboard-subtitle">{animal.name}</h3>
              <p className="panel-copy">
                {animal.breed} · {animal.animalType}
              </p>
            </div>
            <span className="status-badge">{animal.statusLabel}</span>
          </div>
          <p className="panel-copy">{toInterestStatusSummary(animal.status)}</p>
        </li>
      ))}
    </ul>
  );
}
