"use client";

import { useRef, useState, type FormEvent } from "react";

import type { AdminEmployeeDetail } from "@/lib/api/admin";
import { fetchAuthSession } from "@/lib/api/auth";
import type { BffError } from "@/lib/types";

import { StaffEditPanel } from "@/components/admin/staff-edit-panel";

type Props = {
  employee: AdminEmployeeDetail;
  onUpdate: (updated: AdminEmployeeDetail) => void;
  onDelete: () => void;
};

export function AdminStaffDetailClient({ employee, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(employee);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const csrfTokenRef = useRef<string | null>(null);

  function handleSuccess(updated: AdminEmployeeDetail) {
    setCurrentEmployee(updated);
    setEditing(false);
    onUpdate(updated);
  }

  function handleCancel() {
    setEditing(false);
  }

  async function handleDelete() {
    const token = csrfTokenRef.current ?? (await refreshCsrfTokenImpl());

    if (!token) {
      setDeleteError("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/staff/${employee.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
        },
      });

      if (!response.ok) {
        const error = (await response.json()) as BffError;
        throw new Error(error.message ?? "Delete failed.");
      }

      onDelete();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Delete failed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin route</p>
        <h1 className="page-title">{currentEmployee.name}</h1>
        <p className="page-copy">
          <span className="status-badge">{currentEmployee.role}</span>
        </p>
      </section>

      <nav className="breadcrumb">
        <a href="/dashboard/admin/staff" className="link-chip">
          ← Staff
        </a>
      </nav>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Identity</p>
          <h2 className="panel-title">Account metadata</h2>
          <ul className="detail-list">
            <li>
              <strong>Email:</strong> {currentEmployee.email}
            </li>
            <li>
              <strong>Telephone:</strong> {currentEmployee.telephone ?? "No telephone on file."}
            </li>
            <li>
              <strong>Role:</strong> {currentEmployee.role}
            </li>
            <li>
              <strong>Created:</strong> {currentEmployee.createdAt ?? "Unavailable"}
            </li>
            <li>
              <strong>Updated:</strong> {currentEmployee.updatedAt ?? "Unavailable"}
            </li>
          </ul>
        </article>

        {editing ? (
          <StaffEditPanel
            employee={currentEmployee}
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
                Edit staff
              </button>
            </div>
          </article>
        )}

        <article className="panel dashboard-form-panel">
          <p className="eyebrow">Danger zone</p>
          <h2 className="panel-title">Delete this staff record</h2>
          {deleteConfirm ? (
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              <p className="panel-copy">
                Are you sure you want to delete <strong>{currentEmployee.name}</strong>? This action
                cannot be undone.
              </p>
              {deleteError ? (
                <p className="auth-error-banner" aria-live="polite" role="status">
                  {deleteError}
                </p>
              ) : null}
              <div className="auth-actions">
                <button type="submit" className="auth-submit danger" disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Confirm deletion"}
                </button>
                <button
                  type="button"
                  className="auth-submit secondary"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="auth-actions">
              <button
                type="button"
                className="auth-submit danger"
                onClick={() => setDeleteConfirm(true)}
              >
                Delete staff
              </button>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

async function refreshCsrfTokenImpl(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.csrfToken;
  } catch {
    return null;
  }
}