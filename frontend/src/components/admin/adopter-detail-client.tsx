"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminAdopterDetail } from "@/lib/api/admin";

import { AdopterEditPanel } from "@/components/admin/adopter-edit-panel";

type Props = {
  adopter: AdminAdopterDetail;
};

export function AdminAdopterDetailClient({ adopter }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [currentAdopter, setCurrentAdopter] = useState(adopter);

  function handleSuccess(updated: AdminAdopterDetail) {
    setCurrentAdopter(updated);
    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setEditing(false);
  }

  const preferenceEntries = Object.entries(currentAdopter.preferences);

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Admin route</p>
        <h1 className="page-title">{currentAdopter.name}</h1>
        <p className="page-copy">
          <span className="ci-badge">{currentAdopter.status}</span>
        </p>
      </section>

      <nav className="flex items-center gap-2">
        <a href="/dashboard/admin/adopters" className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
          ← Adopters
        </a>
      </nav>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Contact</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Adopter profile</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <strong>Email:</strong> {currentAdopter.email}
            </li>
            <li>
              <strong>Telephone:</strong> {currentAdopter.telephone}
            </li>
            <li>
              <strong>Address:</strong> {currentAdopter.address ?? "No address on file."}
            </li>
            <li>
              <strong>Interested animals:</strong> {currentAdopter.interestCount}
            </li>
          </ul>
        </article>

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Preferences</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Saved adopter preferences</h2>
          {preferenceEntries.length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm">
              {preferenceEntries.map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> {formatPreferenceValue(value)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)]">No preferences are stored for this adopter yet.</p>
          )}
        </article>

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">History</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Adoption history</h2>
          {currentAdopter.history.length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm">
              {currentAdopter.history.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.animalName ?? entry.animalId}:</strong>{" "}
                  {entry.adoptionDate ?? "Unknown adoption date"}
                  {entry.returnDate ? ` · Returned ${entry.returnDate}` : ""}
                  {entry.notes ? ` · ${entry.notes}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)]">No adoption history entries are available for this adopter.</p>
          )}
        </article>

        {editing ? (
          <AdopterEditPanel
            adopter={currentAdopter}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        ) : (
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Actions</p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Manage this record</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="button"
                className="ci-btn ci-btn--primary"
                onClick={() => setEditing(true)}
              >
                Edit adopter
              </button>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}

function formatPreferenceValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ") || "None";
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value === null || value === undefined || value === "" ? "None" : String(value);
}