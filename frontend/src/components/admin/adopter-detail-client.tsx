"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import type { AdminAdopterDetail } from "@/lib/api/admin";

import { AdopterEditPanel } from "@/components/admin/adopter-edit-panel";
import { SuccessCard } from "@/components/ui/success-card";

type Props = {
  adopter: AdminAdopterDetail;
};

export function AdminAdopterDetailClient({ adopter }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [currentAdopter, setCurrentAdopter] = useState(adopter);
  const [successAdopter, setSuccessAdopter] = useState<AdminAdopterDetail | null>(null);

  function handleSuccess(updated: AdminAdopterDetail) {
    setSuccessAdopter(updated);
    router.refresh();
  }

  function handleCancel() {
    setEditing(false);
  }

  const preferenceEntries = Object.entries(currentAdopter.preferences);

  if (successAdopter) {
    return (
      <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8 py-12">
        <SuccessCard
          title="Adopter record updated"
          fields={[
            { label: "Name", value: successAdopter.name },
            { label: "Email", value: successAdopter.email },
            { label: "Telephone", value: successAdopter.telephone },
            { label: "Address", value: successAdopter.address || "—" },
            { label: "Status", value: successAdopter.status },
          ]}
          primaryHref="/dashboard/admin/adopters"
          primaryLabel="See all adopters"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8 space-y-6">
      <nav className="flex items-center gap-2">
        <Link href="/dashboard/admin/adopters" className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
          ← Adopters
        </Link>
      </nav>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Admin route</p>
        <h1 className="page-title">{currentAdopter.name}</h1>
        <p className="page-copy">
          <span className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-[0.6875rem] font-normal tracking-[0.08em] uppercase py-1 px-2.5 rounded-[var(--radius-sm)]">{currentAdopter.status}</span>
        </p>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-6">
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
            <Button onClick={() => setEditing(true)}>Edit adopter</Button>
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