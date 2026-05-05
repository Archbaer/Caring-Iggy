"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import type { AdminEmployeeDetail } from "@/lib/api/admin";
import { refreshCsrfToken } from "@/lib/api/auth";
import { CSRF_HEADER_NAME } from "@/lib/auth/csrf";
import type { BffError } from "@/lib/types";

import { StaffEditPanel } from "@/components/admin/staff-edit-panel";
import { SuccessCard } from "@/components/ui/success-card";

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
  const [successEmployee, setSuccessEmployee] = useState<AdminEmployeeDetail | null>(null);
  const csrfTokenRef = useRef<string | null>(null);

  function handleSuccess(updated: AdminEmployeeDetail) {
    setSuccessEmployee(updated);
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

    const token = csrfTokenRef.current ?? (await refreshCsrfToken());

    if (!token) {
      setDeleteError("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/staff/${employee.id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: token,
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

  if (successEmployee) {
    return (
      <div className="min-h-screen" style={{ background: "var(--gradient-admin-canvas)" }}>
        <div className="max-w-[var(--max-width-content)] mx-auto px-6 sm:px-8 py-12">
          <SuccessCard
            title="Staff record updated"
            fields={[
              { label: "Name", value: successEmployee.name },
              { label: "Email", value: successEmployee.email },
              { label: "Telephone", value: successEmployee.telephone ?? "—" },
              { label: "Role", value: successEmployee.role },
            ]}
            primaryHref="/dashboard/admin/staff"
            primaryLabel="See all staff"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-admin-canvas)" }}>
      {/* Back button — absolute top-left */}
      <div className="max-w-[var(--max-width-wide)] mx-auto px-6 sm:px-8 pt-6 mb-6">
        <Link
          href="/dashboard/admin/staff"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          ← Staff
        </Link>
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
              <span className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-[0.6875rem] font-normal tracking-[0.08em] uppercase py-1 px-2.5 rounded-[var(--radius-sm)]">{currentEmployee.role}</span>
              <p className="text-sm text-[var(--color-ink-soft)]">{currentEmployee.email}</p>
            </div>
          </div>
        </section>

        {/* Info + Edit/Actions row */}
        <section className="grid grid-cols-[1fr_1fr] gap-4 animate-fade-up delay-1">
          {/* Identity card */}
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 flex flex-col gap-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)] text-center">Identity</p>
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
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 flex flex-col gap-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)] text-center">Actions</p>
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
              <Button onClick={() => setEditing(true)}>Edit staff</Button>
            )}
          </article>
        </section>

        {/* Delete card */}
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 mt-4 animate-fade-up delay-2 flex flex-col items-center gap-4 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)]">
            Delete this staff record
          </h2>

          {deleteStep === "initial" ? (
            <Button variant="destructive" onClick={() => setDeleteStep("confirm")}>
              Delete staff
            </Button>
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
                <Button variant="destructive" type="submit" disabled={isDeleting || confirmName.trim() !== currentEmployee.name}>
                  {isDeleting ? "Deleting..." : "Confirm deletion"}
                </Button>
                <Button variant="outline" type="button" onClick={() => {
                  setDeleteStep("initial");
                  setConfirmName("");
                  setDeleteError(null);
                }} disabled={isDeleting}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </article>
      </div>
    </div>
  );
}

