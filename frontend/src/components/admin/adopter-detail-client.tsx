"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <div className="max-w-[var(--max-width-wide)] mx-auto px-6 py-8 bg-canvas-pattern">
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
    <div className="max-w-[80rem] mx-auto px-6 py-8 space-y-6 bg-canvas-pattern">
      <nav className="flex items-center gap-2">
        <Link href="/dashboard/admin/adopters" className="text-[var(--color-accent)] font-semibold text-sm hover:underline">
          ← Adopters
        </Link>
      </nav>

      <section className="rounded-3xl bg-white shadow-[var(--shadow-lg)] border border-[var(--color-border)] p-8">
        <p className="text-xs text-[var(--color-ink-faint)] font-medium">Admin route</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)] mt-2 mb-2">{currentAdopter.name}</h1>
        <p className="mt-2">
          <Badge variant="muted">{currentAdopter.status}</Badge>
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <article className="rounded-3xl bg-white shadow-[var(--shadow-card)] border border-[var(--color-border)] p-8">
          <p className="text-xs text-[var(--color-ink-faint)] font-medium">Contact</p>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--color-ink)] mt-1 mb-4">Adopter profile</h2>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex flex-col gap-0.5">
              <span className="text-xs text-[var(--color-ink-faint)]">Email</span>
              <span className="text-sm text-[var(--color-ink)] font-semibold">{currentAdopter.email}</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-xs text-[var(--color-ink-faint)]">Telephone</span>
              <span className="text-sm text-[var(--color-ink)] font-semibold">{currentAdopter.telephone}</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-xs text-[var(--color-ink-faint)]">Address</span>
              <span className="text-sm text-[var(--color-ink)] font-semibold">{currentAdopter.address ?? "No address on file."}</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-xs text-[var(--color-ink-faint)]">Interested animals</span>
              <span className="text-sm text-[var(--color-ink)] font-semibold">{currentAdopter.interestCount}</span>
            </li>
          </ul>
        </article>

        <article className="rounded-3xl bg-white shadow-[var(--shadow-card)] border border-[var(--color-border)] p-8">
          <p className="text-xs text-[var(--color-ink-faint)] font-medium">Preferences</p>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--color-ink)] mt-1 mb-4">Saved adopter preferences</h2>
          {preferenceEntries.length > 0 ? (
            <ul className="flex flex-col gap-3 text-sm">
              {preferenceEntries.map(([key, value]) => (
                <li key={key} className="flex flex-col gap-0.5">
                  <span className="text-xs text-[var(--color-ink-faint)]">{key}</span>
                  <span className="text-sm text-[var(--color-ink)] font-semibold">{formatPreferenceValue(value)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)]">No preferences are stored for this adopter yet.</p>
          )}
        </article>

        <article className="rounded-3xl bg-white shadow-[var(--shadow-card)] border border-[var(--color-border)] p-8">
          <p className="text-xs text-[var(--color-ink-faint)] font-medium">History</p>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--color-ink)] mt-1 mb-4">Adoption history</h2>
          {currentAdopter.history.length > 0 ? (
            <ul className="flex flex-col gap-3 text-sm">
              {currentAdopter.history.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5">
                  <span className="text-xs text-[var(--color-ink-faint)]">{entry.animalName ?? entry.animalId}</span>
                  <span className="text-sm text-[var(--color-ink)] font-semibold">
                    {entry.adoptionDate ?? "Unknown adoption date"}
                    {entry.returnDate ? ` · Returned ${entry.returnDate}` : ""}
                    {entry.notes ? ` · ${entry.notes}` : ""}
                  </span>
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
          <article className="rounded-3xl bg-white shadow-[var(--shadow-card)] border border-[var(--color-border)] p-8 flex flex-col gap-4">
            <p className="text-xs text-[var(--color-ink-faint)] font-medium">Actions</p>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--color-ink)]">Manage this record</h2>
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
