import Link from "next/link";

import { STATUS_CODES, toStatusLabel } from "@/lib/constants/status-map";
import type { AnimalStatusCode } from "@/lib/types";

type AnimalFiltersProps = {
  status?: AnimalStatusCode;
  type?: string;
};

export function AnimalFilters({ status, type }: AnimalFiltersProps) {
  return (
    <section className="panel animal-filters-panel">
      <p className="eyebrow">Browse filters</p>
      <div className="animal-filters-head">
        <h2 className="panel-title">Refine the public adoption catalog.</h2>
        <p className="panel-copy">
          Filter by mapped status or animal type without leaving the server-rendered route.
        </p>
      </div>

      <form className="animal-filters-form" method="get">
        <label className="animal-filter-field">
          <span className="animal-filter-label">Status</span>
          <select name="status" defaultValue={status ?? ""} className="animal-filter-input">
            <option value="">All statuses</option>
            {STATUS_CODES.map((code) => (
              <option key={code} value={code}>
                {toStatusLabel(code)}
              </option>
            ))}
          </select>
        </label>

        <label className="animal-filter-field">
          <span className="animal-filter-label">Type</span>
          <input
            name="type"
            defaultValue={type ?? ""}
            className="animal-filter-input"
            placeholder="Dog, Cat, Rabbit..."
          />
        </label>

        <div className="hero-actions animal-filters-actions">
          <button type="submit" className="primary-link animal-filter-button">
            Apply filters
          </button>
          <Link href="/animals" className="secondary-link">
            Clear filters
          </Link>
        </div>
      </form>
    </section>
  );
}
