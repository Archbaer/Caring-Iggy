"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import type { AdminEmployeeDetail } from "@/lib/api/admin";
import { fetchAuthSession } from "@/lib/api/auth";
import type { BffError } from "@/lib/types";

import { StaffEditPanel } from "@/components/admin/staff-edit-panel";

type Props = {
  employee: AdminEmployeeDetail;
};

export function AdminStaffDetailClient({ employee }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(employee);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const csrfTokenRef = useRef<string | null>(null);

  function handleSuccess(updated: AdminEmployeeDetail) {
    setCurrentEmployee(updated);
    setEditing(false);
    router.refresh();
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

      router.push("/dashboard/admin/staff");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Delete failed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto p-6 sm:p-8">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Admin route</p>
        <h1 className="page-title">{currentEmployee.name}</h1>
        <p className="page-copy">
          <span className="ci-badge">{currentEmployee.role}</span>
        </p>
      </section>

      <nav className="flex items-center gap-2">
        <a href="/dashboard/admin/staff" className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
          ← Staff
        </a>
      </nav>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Identity</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Account metadata</h2>
          <ul className="flex flex-col gap-2 text-sm">
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
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Actions</p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Manage this record</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="button"
                className="ci-btn ci-btn--primary"
                onClick={() => setEditing(true)}
              >
                Edit staff
              </button>
            </div>
          </article>
        )}

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Danger zone</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Delete this staff record</h2>
          {deleteConfirm ? (
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              <p className="text-sm text-[var(--color-ink-soft)]">
                Are you sure you want to delete <strong>{currentEmployee.name}</strong>? This action
                cannot be undone.
              </p>
              {deleteError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" aria-live="polite" role="status">
                  {deleteError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 items-center">
                <button type="submit" className="ci-btn ci-btn--primary danger" disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Confirm deletion"}
                </button>
                <button
                  type="button"
                  className="ci-btn ci-btn--secondary secondary"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="button"
                className="ci-btn ci-btn--primary danger"
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