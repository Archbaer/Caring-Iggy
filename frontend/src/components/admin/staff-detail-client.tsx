"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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
  const [deleteStep, setDeleteStep] = useState<"initial" | "confirm">("initial");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");
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
    if (confirmName.trim() !== currentEmployee.name) {
      setDeleteError("Name does not match. Please type the staff member's name to confirm.");
      return;
    }

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
    <div className="min-h-screen" style={{ background: "var(--gradient-admin-canvas)" }}>
      {/* Back button — absolute top-left */}
      <div className="max-w-[var(--max-width-wide)] mx-auto px-6 sm:px-8 pt-6 mb-6">
        <a
          href="/dashboard/admin/staff"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          ← Staff
        </a>
      </div>

      <div className="max-w-[var(--max-width-wide)] mx-auto px-6 sm:px-8 pb-8">
        {/* Hero card */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 sm:p-8 pt-8 mb-6 animate-fade-up">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Employee records</p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] mb-2">
              {currentEmployee.name}
            </h1>
            <div className="flex items-center gap-3">
              <span className="ci-badge">{currentEmployee.role}</span>
              <p className="text-sm text-[var(--color-ink-soft)]">{currentEmployee.email}</p>
            </div>
          </div>
        </section>

        {/* Info + Edit/Actions row */}
        <section className="grid grid-cols-[1fr_1fr] gap-4 animate-fade-up delay-1">
          {/* Identity card */}
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Identity</p>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)]">
              Account metadata
            </h2>
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex flex-col gap-0.5">
                <span className="text-[var(--color-ink-soft)]">Email</span>
                <span className="font-medium text-[var(--color-ink)]">{currentEmployee.email}</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="text-[var(--color-ink-soft)]">Telephone</span>
                <span className="font-medium text-[var(--color-ink)]">{currentEmployee.telephone ?? "No telephone on file."}</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="text-[var(--color-ink-soft)]">Role</span>
                <span className="font-medium text-[var(--color-ink)]">{currentEmployee.role}</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="text-[var(--color-ink-soft)]">Created</span>
                <span className="font-medium text-[var(--color-ink)]">{currentEmployee.createdAt ?? "Unavailable"}</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="text-[var(--color-ink-soft)]">Updated</span>
                <span className="font-medium text-[var(--color-ink)]">{currentEmployee.updatedAt ?? "Unavailable"}</span>
              </li>
            </ul>
          </article>

          {/* Edit/Actions card */}
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Actions</p>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)]">
              Manage this record
            </h2>

            {/* Edit expand area */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                editing ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {editing && (
                <StaffEditPanel
                  employee={currentEmployee}
                  onCancel={handleCancel}
                  onSuccess={handleSuccess}
                />
              )}
            </div>

            {!editing && (
              <button
                type="button"
                className="ci-btn ci-btn--primary w-fit"
                onClick={() => setEditing(true)}
              >
                Edit staff
              </button>
            )}
          </article>
        </section>

        {/* Delete card */}
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 mt-4 animate-fade-up delay-2 flex flex-col items-center gap-4 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)]">
            Delete this staff record
          </h2>

          {deleteStep === "initial" ? (
            <button
              type="button"
              className="ci-btn ci-btn--danger px-8 py-3 text-base font-semibold"
              onClick={() => setDeleteStep("confirm")}
            >
              Delete staff
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="flex flex-col items-center gap-4 w-full"
            >
              <p className="text-sm text-[var(--color-ink-soft)]">
                Type <strong className="text-[var(--color-ink)]">{currentEmployee.name}</strong> to confirm deletion. This action cannot be undone.
              </p>
              <input
                type="text"
                autoComplete="off"
                className="w-full max-w-sm appearance-none rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]/30 transition-all duration-200"
                placeholder={currentEmployee.name}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
              />
              {deleteError ? (
                <p className="rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-surface)] p-4 text-sm text-[var(--color-danger)]">
                  {deleteError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 items-center justify-center">
                <button
                  type="submit"
                  className="ci-btn ci-btn--danger px-8 py-3 text-base font-semibold"
                  disabled={isDeleting || confirmName.trim() !== currentEmployee.name}
                >
                  {isDeleting ? "Deleting..." : "Confirm deletion"}
                </button>
                <button
                  type="button"
                  className="ci-btn ci-btn--ghost text-sm"
                  onClick={() => {
                    setDeleteStep("initial");
                    setConfirmName("");
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </article>
      </div>
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
