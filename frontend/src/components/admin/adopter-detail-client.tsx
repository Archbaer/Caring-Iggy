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
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">{currentAdopter.name}</h1>
        <p className="page-copy">
          <span className="status-badge">{currentAdopter.status}</span>
        </p>
      </section>

      <nav className="breadcrumb">
        <a href="/dashboard/admin/adopters" className="link-chip">
          ← Adopters
        </a>
      </nav>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Contact</p>
          <h2 className="panel-title">Adopter profile</h2>
          <ul className="detail-list">
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

        <article className="panel">
          <p className="eyebrow">Preferences</p>
          <h2 className="panel-title">Saved adopter preferences</h2>
          {preferenceEntries.length > 0 ? (
            <ul className="detail-list">
              {preferenceEntries.map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> {formatPreferenceValue(value)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-copy">No preferences are stored for this adopter yet.</p>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">History</p>
          <h2 className="panel-title">Adoption history</h2>
          {currentAdopter.history.length > 0 ? (
            <ul className="detail-list">
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
            <p className="panel-copy">No adoption history entries are available for this adopter.</p>
          )}
        </article>

        {editing ? (
          <AdopterEditPanel
            adopter={currentAdopter}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        ) : (
          <article className="panel dashboard-form-panel">
            <p className="eyebrow">Actions</p>
            <h2 className="panel-title">Manage this record</h2>
            <div className="auth-actions">
              <button
                type="button"
                className="auth-submit"
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